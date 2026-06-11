"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { requestCrossStoreFeature } from "@/app/actions/cross-store";
import type { ContentLinkType } from "@/lib/content-links/types";
import { toastFormError } from "@/lib/feedback/toasts";

type Props = {
  itemType: ContentLinkType;
  itemId: string;
  storeName: string;
  canRequest: boolean;
  alreadyRequested: boolean;
};

export default function RequestFeatureButton({
  itemType,
  itemId,
  storeName,
  canRequest,
  alreadyRequested,
}: Props) {
  const [requested, setRequested] = useState(alreadyRequested);
  const [isPending, startTransition] = useTransition();

  if (!canRequest) return null;

  if (requested) {
    return (
      <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-500">
        Requested
      </span>
    );
  }

  function handleClick() {
    startTransition(async () => {
      const result = await requestCrossStoreFeature(itemType, itemId);
      if (!result.ok) {
        toastFormError(result.error);
        return;
      }
      setRequested(true);
      toast.success(`Feature request sent to ${storeName}`);
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 font-sans text-xs font-semibold text-zinc-600 transition-colors hover:border-[#D4450A]/30 hover:bg-[#D4450A]/5 hover:text-[#D4450A] disabled:opacity-50"
    >
      Request to feature
    </button>
  );
}
