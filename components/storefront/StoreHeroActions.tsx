"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  IconEdit,
  IconMessage,
  IconBookmark,
} from "@tabler/icons-react";

import { getOrCreateConversation } from "@/app/actions/messages";
import { toggleFollowStore } from "@/app/actions/store";
import { toastFormError } from "@/lib/feedback/toasts";
import ShareActionButton from "@/components/ui/ShareActionButton";

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
  storeSlug: string;
  storeName: string;
  canEditStore: boolean;
  isLoggedIn: boolean;
  initialFollowing: boolean;
};

export default function StoreHeroActions({
  storeId,
  storeSlug,
  storeName,
  canEditStore,
  isLoggedIn,
  initialFollowing,
}: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [followBusy, setFollowBusy] = useState(false);
  const [messagePending, startMessageTransition] = useTransition();

  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/store/${storeSlug}`)}`;

  const onFollow = useCallback(async () => {
    setFollowBusy(true);
    const prev = following;
    setFollowing(!prev);
    const result = await toggleFollowStore(storeId);
    if ("error" in result) {
      setFollowing(prev);
      if (result.error.includes("Sign in")) {
        router.push(loginHref);
      }
    } else {
      setFollowing(result.following);
    }
    setFollowBusy(false);
  }, [following, loginHref, router, storeId]);

  function handleMessageClick() {
    if (!isLoggedIn) return;
    if (canEditStore) {
      toastFormError("This is your store.");
      return;
    }

    startMessageTransition(async () => {
      const result = await getOrCreateConversation(storeId);
      if (!result.ok) {
        toastFormError(result.error);
        return;
      }
      router.push(`/messages/${result.conversationId}`);
    });
  }

  return (
    <div className="relative z-[70] flex w-full shrink-0 flex-row items-center gap-2 md:w-auto md:flex-wrap md:justify-end md:pb-0.5">
      {canEditStore ? (
        <Link
          href="/dashboard/vendor/store/edit"
          className="inline-flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded-[9px] px-3 text-xs font-semibold text-white transition hover:opacity-90 md:flex-none"
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
          className={`${glassBtn} min-w-0 flex-1 px-3 md:flex-none`}
          style={glassStyle}
        >
          <IconBookmark className="size-4 shrink-0" stroke={1.75} aria-hidden />
          {following ? "Saved" : "Save store"}
        </button>
      )}

      <ShareActionButton title={storeName} label="" className="!min-h-[34px] !h-[34px] !min-w-[34px] !rounded-[9px] !border-0 !bg-white/15 !px-0 !text-white !shadow-none backdrop-blur" />

      {!canEditStore ? (
        isLoggedIn ? (
          <button
            type="button"
            disabled={messagePending}
            className={`${glassBtn} shrink-0`}
            style={glassStyle}
            aria-label="Message store"
            title="Message store"
            onClick={handleMessageClick}
          >
            <IconMessage className="size-4" stroke={1.75} aria-hidden />
          </button>
        ) : (
          <Link
            href={loginHref}
            className={`${glassBtn} shrink-0`}
            style={glassStyle}
            aria-label="Message store"
            title="Message store"
          >
            <IconMessage className="size-4" stroke={1.75} aria-hidden />
          </Link>
        )
      ) : null}
    </div>
  );
}
