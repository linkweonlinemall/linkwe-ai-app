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

import styles from "./storefront.module.css";

type Props = {
  storeId: string;
  storeSlug: string;
  storeName: string;
  canEditStore: boolean;
  isLoggedIn: boolean;
  initialFollowing: boolean;
  preview?: boolean;
};

export default function StoreHeroActions({
  storeId,
  storeSlug,
  storeName,
  canEditStore,
  isLoggedIn,
  initialFollowing,
  preview = false,
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

  if (preview) return <div className={styles.heroActions}><Link href={`https://www.linkweonlinemall.com/store/${storeSlug}`}><IconBookmark size={17} aria-hidden />Follow store</Link><ShareActionButton title={storeName} label="Share" className={styles.shareButton} /><Link href={`https://www.linkweonlinemall.com/store/${storeSlug}`}><IconMessage size={17} aria-hidden />Message</Link></div>;
  return <div className={styles.heroActions}>
    {canEditStore ? <Link href="/dashboard/vendor/store/edit"><IconEdit size={17} aria-hidden />Edit store</Link> : <button type="button" disabled={followBusy} onClick={() => void onFollow()} aria-pressed={following}><IconBookmark size={17} aria-hidden />{following ? "Following" : "Follow store"}</button>}
    <ShareActionButton title={storeName} label="Share" className={styles.shareButton} />
    {!canEditStore && (isLoggedIn ? <button type="button" disabled={messagePending} onClick={handleMessageClick}><IconMessage size={17} aria-hidden />{messagePending ? "Opening…" : "Message"}</button> : <Link href={loginHref}><IconMessage size={17} aria-hidden />Message</Link>)}
  </div>;
}
