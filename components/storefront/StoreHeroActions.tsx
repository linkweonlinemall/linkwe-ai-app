"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  IconEdit,
  IconMessage,
  IconShare2,
  IconUserPlus,
} from "@tabler/icons-react";

import { toggleFollowStore } from "@/app/actions/store";

const SCARLET = "#D4450A";

const glassBtn =
  "inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-[9px] text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60";
const glassStyle = {
  backgroundColor: "rgba(255,255,255,0.15)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
} as const;

type Props = {
  storeId: string;
  storeName: string;
  canEditStore: boolean;
  initialFollowing: boolean;
};

export default function StoreHeroActions({
  storeId,
  storeName,
  canEditStore,
  initialFollowing,
}: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [followBusy, setFollowBusy] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  useEffect(() => {
    if (!showShare) return;
    const onDocClick = () => setShowShare(false);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [showShare]);

  const onFollow = useCallback(async () => {
    setFollowBusy(true);
    const prev = following;
    setFollowing(!prev);
    const result = await toggleFollowStore(storeId);
    if ("error" in result) {
      setFollowing(prev);
      if (result.error.includes("Sign in")) {
        router.push("/login");
      }
    } else {
      setFollowing(result.following);
    }
    setFollowBusy(false);
  }, [following, router, storeId]);

  return (
    <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 pb-0.5 max-md:justify-start md:w-auto">
      {canEditStore ? (
        <Link
          href="/dashboard/vendor/store/edit"
          className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] px-3 text-xs font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: SCARLET }}
        >
          <IconEdit className="size-4" stroke={1.75} aria-hidden />
          Edit store
        </Link>
      ) : (
        <button
          type="button"
          disabled={followBusy}
          onClick={() => void onFollow()}
          className={`${glassBtn} px-3`}
          style={glassStyle}
        >
          <IconUserPlus className="size-4" stroke={1.75} aria-hidden />
          {following ? "Following" : "Follow"}
        </button>
      )}

      <div className="relative">
        <button
          type="button"
          className={glassBtn}
          style={glassStyle}
          aria-label="Share store"
          onClick={(e) => {
            e.stopPropagation();
            setShowShare((v) => !v);
          }}
        >
          <IconShare2 className="size-4" stroke={1.75} aria-hidden />
        </button>
        {showShare ? (
          <div
            className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Share
            </p>
            <div className="flex flex-col gap-1">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${storeName} — ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg px-2 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                WhatsApp
              </a>
              <button
                type="button"
                className="rounded-lg px-2 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                onClick={() => {
                  void navigator.clipboard.writeText(shareUrl);
                  setShowShare(false);
                }}
              >
                Copy link
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={glassBtn}
        style={glassStyle}
        aria-label="Message store"
        title="Message store"
      >
        <IconMessage className="size-4" stroke={1.75} aria-hidden />
      </button>
    </div>
  );
}
