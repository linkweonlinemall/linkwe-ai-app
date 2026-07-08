"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { getOrCreateConversation, sendMessage } from "@/app/actions/messages";
import { toastFormError } from "@/lib/feedback/toasts";

const SCARLET = "#D4450A";

const ctaClassName =
  "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  storeId: string;
  storeSlug: string;
  serviceName: string;
  serviceSlug: string;
  isLoggedIn: boolean;
  isOwnStore: boolean;
};

export default function QuoteContactButton({
  storeId,
  storeSlug,
  serviceName,
  serviceSlug,
  isLoggedIn,
  isOwnStore,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/service/${serviceSlug}`)}`;

  function handleContactClick() {
    if (!isLoggedIn || isOwnStore) {
      if (isOwnStore) toastFormError("This is your store.");
      return;
    }

    startTransition(async () => {
      const result = await getOrCreateConversation(storeId);
      if (!result.ok) {
        toastFormError(result.error);
        return;
      }

      if (result.created) {
        const seedContent = `Hi, I'd like a quote for: ${serviceName}.`;
        await sendMessage(result.conversationId, seedContent);
      }

      router.push(`/messages/${result.conversationId}`);
    });
  }

  if (!isLoggedIn) {
    return (
      <Link href={loginHref} className={ctaClassName} style={{ backgroundColor: SCARLET }}>
        Contact provider →
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pending || isOwnStore}
      onClick={handleContactClick}
      className={ctaClassName}
      style={{ backgroundColor: SCARLET }}
    >
      {pending ? "Opening…" : "Contact provider →"}
    </button>
  );
}
