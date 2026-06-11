"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { IconArrowLeft } from "@tabler/icons-react";

import { adminSendMessage } from "@/app/actions/messages";
import { toastFormError } from "@/lib/feedback/toasts";

export type AdminThreadMessage = {
  id: string;
  senderRole: string;
  content: string;
  timeLabel: string;
};

type Props = {
  conversationId: string;
  customerName: string;
  storeName: string;
  initialMessages: AdminThreadMessage[];
};

const CARD_BORDER = "border-[0.5px] border-[rgba(28,28,26,0.12)]";

export default function AdminMessageThread({
  conversationId,
  customerName,
  storeName,
  initialMessages,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isPending) return;

    startTransition(async () => {
      const result = await adminSendMessage(conversationId, text);
      if (!result.ok) {
        toastFormError(result.error);
        return;
      }
      setDraft("");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-[#F7F5F5]">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-[rgba(28,28,26,0.08)] bg-white px-3 py-2.5 sm:px-4 sm:py-3">
        <Link
          href="/dashboard/admin/messages"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] text-[#7c7b77] transition-colors hover:bg-[#F7F5F2] hover:text-[#1C1C1A]"
          aria-label="Back to messages"
        >
          <IconArrowLeft className="size-5" stroke={1.75} aria-hidden />
        </Link>
        <h1 className="truncate text-[15px] font-medium text-[#1C1C1A]">
          {customerName}
          <span className="mx-1.5 font-normal text-[#7c7b77]">↔</span>
          {storeName}
        </h1>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-2 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
        {initialMessages.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-[#7c7b77]">
            No messages in this conversation yet.
          </p>
        ) : (
          initialMessages.map((msg) => {
            if (msg.senderRole === "ADMIN") {
              return (
                <div key={msg.id} className="flex flex-col items-center gap-0.5 px-2 py-0.5">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-[#D4450A]/80">
                    LinkWe Support
                  </span>
                  <div
                    className={`max-w-[75%] rounded-[12px] bg-[#FFFBEB] px-4 py-2 text-center text-[13px] leading-snug text-[#1C1C1A] ${CARD_BORDER}`}
                    style={{ borderColor: "rgba(212,69,10,0.15)" }}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-[#7c7b77]">{msg.timeLabel}</span>
                </div>
              );
            }

            if (msg.senderRole === "VENDOR") {
              return (
                <div key={msg.id} className="flex flex-col items-end gap-0.5 py-0.5">
                  <span className="px-1 text-[9px] font-medium uppercase tracking-wider text-[#7c7b77]">
                    {storeName}
                  </span>
                  <div
                    className={`max-w-[75%] rounded-2xl rounded-br-sm bg-[#f5f5f5] px-4 py-2 text-[13px] leading-snug text-[#1C1C1A] ${CARD_BORDER}`}
                  >
                    {msg.content}
                  </div>
                  <span className="px-1 text-[10px] text-[#7c7b77]">{msg.timeLabel}</span>
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex flex-col items-start gap-0.5 py-0.5">
                <span className="px-1 text-[9px] font-medium uppercase tracking-wider text-[#7c7b77]">
                  {customerName}
                </span>
                <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-[#D4450A] px-4 py-2 text-[13px] leading-snug text-white">
                  {msg.content}
                </div>
                <span className="px-1 text-[10px] text-[#7c7b77]">{msg.timeLabel}</span>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="sticky bottom-0 border-t border-[rgba(28,28,26,0.08)] bg-white px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-3"
      >
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={1}
            placeholder="Reply as LinkWe Support…"
            className={`min-h-[40px] max-h-28 flex-1 resize-none rounded-[10px] bg-white px-3 py-2 text-[13px] text-[#1C1C1A] outline-none focus:border-[#D4450A] focus:ring-1 focus:ring-[#D4450A]/30 ${CARD_BORDER}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button
            type="submit"
            disabled={!draft.trim() || isPending}
            className="flex h-[40px] shrink-0 items-center justify-center rounded-[10px] bg-[#D4450A] px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:bg-[#e8e8e6] disabled:text-[#7c7b77]"
          >
            {isPending ? "…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
