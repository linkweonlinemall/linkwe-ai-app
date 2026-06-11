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
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-[#F5F5F5]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <Link
          href="/dashboard/admin/messages"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100"
          aria-label="Back to messages"
        >
          <IconArrowLeft className="size-5" stroke={1.75} aria-hidden />
        </Link>
        <h1 className="truncate text-base font-semibold text-[#1C1C1A]">
          {customerName}
          <span className="mx-1.5 font-normal text-zinc-400">↔</span>
          {storeName}
        </h1>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {initialMessages.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            No messages in this conversation yet.
          </p>
        ) : (
          initialMessages.map((msg) => {
            if (msg.senderRole === "ADMIN") {
              return (
                <div key={msg.id} className="flex flex-col items-center gap-1 px-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#D4450A]">
                    LinkWe Support
                  </span>
                  <div className="max-w-[90%] rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-950">
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-zinc-400">{msg.timeLabel}</span>
                </div>
              );
            }

            if (msg.senderRole === "VENDOR") {
              return (
                <div key={msg.id} className="flex flex-col items-end gap-1">
                  <span className="px-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                    Vendor
                  </span>
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-white px-4 py-2.5 text-sm leading-relaxed text-[#1C1C1A] ring-1 ring-zinc-200">
                    {msg.content}
                  </div>
                  <span className="px-1 text-[10px] text-zinc-400">{msg.timeLabel}</span>
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex flex-col items-start gap-1">
                <span className="px-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  Customer
                </span>
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-[#D4450A] px-4 py-2.5 text-sm leading-relaxed text-white">
                  {msg.content}
                </div>
                <span className="px-1 text-[10px] text-zinc-400">{msg.timeLabel}</span>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="sticky bottom-0 border-t border-zinc-200 bg-white px-4 py-3"
      >
        <div className="mx-auto flex max-w-2xl gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Reply as LinkWe Support…"
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-[#1C1C1A] outline-none ring-[#D4450A] focus:border-[#D4450A] focus:ring-2"
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
            className="flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-[#D4450A] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
