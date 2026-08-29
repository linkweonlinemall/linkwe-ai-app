"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { IconLink } from "@tabler/icons-react";

import {
  removeCrossStoreFeature,
  respondToCrossStoreRequest,
} from "@/app/actions/cross-store";
import type {
  CrossStoreOutgoingRow,
  CrossStoreRequestRow,
} from "@/lib/cross-store/types";
import type { ContentLinkType } from "@/lib/content-links/types";
import { toastFormError } from "@/lib/feedback/toasts";

const TYPE_LABELS: Record<ContentLinkType, string> = {
  PRODUCT: "Product",
  SERVICE: "Service",
  EVENT: "Event",
};

const STATUS_STYLES = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-zinc-100 text-zinc-500",
} as const;

type Props = {
  initialIncoming: CrossStoreRequestRow[];
  initialOutgoing: CrossStoreOutgoingRow[];
};

function ItemThumb({ image, name }: { image: string | null; name: string }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        className="h-12 w-12 shrink-0 rounded-xl border border-zinc-100 object-cover"
      />
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FEF0EB] text-sm font-bold text-[#D4450A]">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function TypeBadge({ type }: { type: ContentLinkType }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
      {TYPE_LABELS[type]}
    </span>
  );
}

function StatusPill({ status }: { status: keyof typeof STATUS_STYLES }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      {status === "PENDING" ? "Pending" : status === "APPROVED" ? "Approved" : "Rejected"}
    </span>
  );
}

export default function PartnerRequestsClient({
  initialIncoming,
  initialOutgoing,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);

  function runAction(relationshipId: string, action: () => Promise<{ ok: boolean; error?: string }>) {
    setActingId(relationshipId);
    startTransition(async () => {
      const result = await action();
      setActingId(null);
      if (!result.ok) {
        toastFormError(result.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    });
  }

  function handleRespond(relationshipId: string, decision: "APPROVED" | "REJECTED") {
    runAction(relationshipId, () => respondToCrossStoreRequest(relationshipId, decision));
  }

  function handleRemove(relationshipId: string) {
    runAction(relationshipId, () => removeCrossStoreFeature(relationshipId));
  }

  return (
    <div className="flex flex-col gap-8">
      <section data-tour="collab-incoming" className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-bold text-zinc-900">Requests to feature your items</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Other stores asking to showcase your products, services, or events
          </p>
        </div>

        {initialIncoming.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-12 text-center">
            <IconLink className="mb-3 size-10 text-zinc-300" stroke={1.25} aria-hidden />
            <p className="text-sm text-zinc-500">No feature requests yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-50">
            {initialIncoming.map((request) => {
              const busy = isPending && actingId === request.relationshipId;
              return (
                <li
                  key={request.relationshipId}
                  className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {request.item ? (
                      <ItemThumb image={request.item.image} name={request.item.name} />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xs text-zinc-400">
                        ?
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        {request.requestingStoreName}
                      </p>
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {request.item?.name ?? "Unavailable item"}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {request.item ? <TypeBadge type={request.item.type} /> : null}
                        {request.status !== "PENDING" ? (
                          <StatusPill status={request.status} />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    {request.status === "PENDING" ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleRespond(request.relationshipId, "APPROVED")}
                          className="min-h-[40px] rounded-xl bg-[#D4450A] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleRespond(request.relationshipId, "REJECTED")}
                          className="min-h-[40px] rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    ) : request.status === "APPROVED" ? (
                      <>
                        <StatusPill status="APPROVED" />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleRemove(request.relationshipId)}
                          className="min-h-[40px] rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <StatusPill status="REJECTED" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section data-tour="collab-outgoing" className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-bold text-zinc-900">Items you&apos;ve asked to feature</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Partner content you&apos;ve requested from other stores
          </p>
        </div>

        {initialOutgoing.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-12 text-center">
            <IconLink className="mb-3 size-10 text-zinc-300" stroke={1.25} aria-hidden />
            <p className="text-sm text-zinc-500">
              You haven&apos;t requested to feature any items yet.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-50">
            {initialOutgoing.map((request) => {
              const busy = isPending && actingId === request.relationshipId;
              return (
                <li
                  key={request.relationshipId}
                  className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {request.item ? (
                      <ItemThumb image={request.item.image} name={request.item.name} />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xs text-zinc-400">
                        ?
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        {request.targetStoreName}
                      </p>
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {request.item?.name ?? "Unavailable item"}
                      </p>
                      <div className="mt-1.5">
                        {request.item ? <TypeBadge type={request.item.type} /> : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <StatusPill status={request.status} />
                    {request.status === "APPROVED" || request.status === "PENDING" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleRemove(request.relationshipId)}
                        className="min-h-[40px] rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                      >
                        {request.status === "PENDING" ? "Cancel request" : "Remove"}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
