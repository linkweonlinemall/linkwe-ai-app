"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { getOrCreateConversationAsVendor } from "@/app/actions/messages";

type Props = { customerId: string; storeId: string };

export function MessageCustomerButton({ customerId, storeId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await getOrCreateConversationAsVendor(customerId, storeId);
    setLoading(false);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    router.push(`/dashboard/vendor/messages/${result.conversationId}`);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-60"
    >
      {loading ? (
        "Opening..."
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Message customer
        </>
      )}
    </button>
  );
}
