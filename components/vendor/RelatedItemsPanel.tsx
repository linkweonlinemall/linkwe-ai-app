"use client";

import { useMemo, useState, useTransition } from "react";
import { IconPlus, IconX } from "@tabler/icons-react";

import {
  attachContent,
  detachContent,
  getAttachableItems,
  getLinkedContent,
} from "@/app/actions/content-links";
import type {
  AttachableContentItem,
  ContentLinkItem,
  ContentLinkType,
} from "@/lib/content-links/types";
import { toastFormError } from "@/lib/feedback/toasts";

const CARD_BORDER = "border-[0.5px] border-[rgba(28,28,26,0.12)]";

const TYPE_LABELS: Record<ContentLinkType, string> = {
  PRODUCT: "Product",
  SERVICE: "Service",
  EVENT: "Event",
};

const GROUP_ORDER: ContentLinkType[] = ["PRODUCT", "SERVICE", "EVENT"];

type Props = {
  fromType: ContentLinkType;
  fromId: string;
  initialItems: ContentLinkItem[];
};

function ItemThumb({ image, name }: { image: string | null; name: string }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        className="h-10 w-10 shrink-0 rounded-[8px] border border-[rgba(28,28,26,0.08)] object-cover"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#FEF0EB] text-[12px] font-semibold text-[#D4450A]">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function RelatedItemsPanel({
  fromType,
  fromId,
  initialItems,
}: Props) {
  const [linkedItems, setLinkedItems] = useState(initialItems);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [candidates, setCandidates] = useState<AttachableContentItem[]>([]);
  const [filter, setFilter] = useState("");
  const [loadingPicker, setLoadingPicker] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filteredGroups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? candidates.filter((c) => c.name.toLowerCase().includes(q))
      : candidates;

    return GROUP_ORDER.map((type) => ({
      type,
      label: TYPE_LABELS[type],
      items: filtered.filter((c) => c.type === type),
    })).filter((g) => g.items.length > 0);
  }, [candidates, filter]);

  async function refreshLinked() {
    const result = await getLinkedContent(fromType, fromId, {
      includeUnpublished: true,
    });
    setLinkedItems(result.items);
  }

  async function openPicker() {
    setPickerOpen(true);
    setFilter("");
    setLoadingPicker(true);
    try {
      const result = await getAttachableItems(fromType, fromId);
      if ("ok" in result && result.ok === false) {
        toastFormError(result.error);
        setPickerOpen(false);
        return;
      }
      setCandidates("items" in result ? result.items : []);
    } finally {
      setLoadingPicker(false);
    }
  }

  function closePicker() {
    setPickerOpen(false);
    setFilter("");
    setCandidates([]);
  }

  function handleAttach(candidate: AttachableContentItem) {
    startTransition(async () => {
      const result = await attachContent(
        fromType,
        fromId,
        candidate.type,
        candidate.id,
      );
      if (!result.ok) {
        toastFormError(result.error);
        return;
      }
      setCandidates((prev) =>
        prev.filter((c) => !(c.type === candidate.type && c.id === candidate.id)),
      );
      await refreshLinked();
    });
  }

  function handleDetach(linkId: string) {
    startTransition(async () => {
      const result = await detachContent(linkId);
      if (!result.ok) {
        toastFormError(result.error);
        return;
      }
      setLinkedItems((prev) => prev.filter((item) => item.linkId !== linkId));
    });
  }

  return (
    <div className={`rounded-[12px] bg-white p-5 ${CARD_BORDER}`}>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#1C1C1A]">Related items</p>
          <p className="mt-0.5 text-[12px] text-[#7c7b77]">
            Products, services, or events shown together on the public page.
          </p>
        </div>
        <button
          type="button"
          disabled={isPending || pickerOpen}
          onClick={() => void openPicker()}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] bg-[#D4450A] px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <IconPlus className="size-4" stroke={2} aria-hidden />
          Add related item
        </button>
      </div>

      {linkedItems.length === 0 ? (
        <p className="mt-4 rounded-[10px] bg-[#F7F5F2] px-4 py-6 text-center text-[13px] leading-relaxed text-[#7c7b77]">
          No related items yet. Attach products, services, or events to show them on
          this page.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {linkedItems.map((item) => (
            <li
              key={item.linkId}
              className={`flex items-center gap-3 rounded-[10px] bg-[#FAFAF9] px-3 py-2.5 ${CARD_BORDER}`}
            >
              <ItemThumb image={item.image} name={item.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[#1C1C1A]">
                  {item.name}
                </p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#7c7b77]">
                  {TYPE_LABELS[item.type]}
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDetach(item.linkId)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-[#7c7b77] transition-colors hover:bg-[#FEF0EB] hover:text-[#D4450A] disabled:opacity-50"
                aria-label={`Remove ${item.name}`}
              >
                <IconX className="size-4" stroke={2} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pickerOpen ? (
        <div
          className={`mt-4 rounded-[12px] bg-[#F7F5F2] p-4 ${CARD_BORDER}`}
          role="dialog"
          aria-label="Add related item"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-[#1C1C1A]">Choose an item</p>
            <button
              type="button"
              onClick={closePicker}
              className="text-[12px] font-medium text-[#7c7b77] hover:text-[#1C1C1A]"
            >
              Close
            </button>
          </div>

          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by name…"
            className={`mb-4 w-full rounded-[10px] bg-white px-3 py-2 text-[13px] text-[#1C1C1A] outline-none focus:border-[#D4450A] focus:ring-1 focus:ring-[#D4450A]/30 ${CARD_BORDER}`}
          />

          {loadingPicker ? (
            <p className="py-6 text-center text-[13px] text-[#7c7b77]">Loading…</p>
          ) : filteredGroups.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-[#7c7b77]">
              {candidates.length === 0
                ? "No more items to attach."
                : "No matches for your search."}
            </p>
          ) : (
            <div className="flex max-h-[min(60vh,420px)] flex-col gap-4 overflow-y-auto">
              {filteredGroups.map((group) => (
                <div key={group.type}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#7c7b77]">
                    {group.label}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {group.items.map((candidate) => (
                      <li
                        key={`${candidate.type}-${candidate.id}`}
                        className={`flex items-center gap-3 rounded-[10px] bg-white px-3 py-2.5 ${CARD_BORDER}`}
                      >
                        <ItemThumb image={candidate.image} name={candidate.name} />
                        <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#1C1C1A]">
                          {candidate.name}
                        </p>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleAttach(candidate)}
                          className="shrink-0 rounded-[8px] border border-[rgba(212,69,10,0.35)] px-3 py-1.5 text-[12px] font-semibold text-[#D4450A] transition-colors hover:bg-[#FEF0EB] disabled:opacity-50"
                        >
                          Add
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
