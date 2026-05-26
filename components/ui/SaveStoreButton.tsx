"use client";

import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { toggleSavedStore } from "@/app/actions/wishlist";
import Skeleton from "@/components/ui/skeleton";
import { colors } from "@/lib/design-system";
import { toastFormError, toastStoreSaved } from "@/lib/feedback/toasts";

type Props = {
  storeId: string;
  initialSaved: boolean;
  /** Compact circle on store cards (inside a link); click does not navigate. */
  variant?: "default" | "iconOverlay";
};

export default function SaveStoreButton({ storeId, initialSaved, variant = "default" }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    setLoading(true);
    const result = await toggleSavedStore(storeId);
    if ("error" in result) {
      if (result.error === "not_logged_in") {
        router.push("/login");
      } else {
        toastFormError();
      }
    } else {
      setSaved(result.saved);
      if (result.saved) {
        toastStoreSaved();
      }
    }
    setLoading(false);
  }

  if (variant === "iconOverlay") {
    return (
      <button
        type="button"
        aria-label={saved ? "Saved store — remove from saved" : "Save store"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void handleToggle();
        }}
        disabled={loading}
        className="pointer-events-auto absolute right-4 top-4 z-20 flex size-10 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-colors duration-200 ease-in-out hover:bg-white disabled:opacity-60"
      >
        {loading ? (
          <Skeleton className="size-[18px] shrink-0 rounded-full" />
        ) : (
          <Bookmark
            className="size-[18px] shrink-0"
            strokeWidth={2}
            fill={saved ? colors.scarlet : "none"}
            color={saved ? colors.scarlet : "#1C1C1A"}
            aria-hidden
          />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleToggle()}
      disabled={loading}
      className={`flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-4 py-2 text-xs font-bold transition-all duration-200 ease-in-out hover:shadow-sm disabled:opacity-50 ${
        saved
          ? "border-[#D4450A] bg-[#D4450A] text-white hover:bg-[#B83A09]"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-[#D4450A] hover:text-[#D4450A]"
      }`}
    >
      {loading ? (
        <Skeleton className="h-3.5 w-3.5 shrink-0 rounded-full" />
      ) : (
        <Bookmark
          width={14}
          height={14}
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        />
      )}
      {saved ? "Saved" : "Save store"}
    </button>
  );
}
