"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { IconArrowLeft } from "@tabler/icons-react";

import { sendMessage } from "@/app/actions/messages";
import { toastFormError } from "@/lib/feedback/toasts";

export type ThreadMessage = {
  id: string;
  senderId: string;
  senderRole: string;
  content: string;
  timeLabel: string;
};

type Props = {
  conversationId: string;
  storeName: string;
  currentUserId: string;
  initialMessages: ThreadMessage[];
};

export function MessageThread({
  conversationId,
  storeName,
  currentUserId,
  initialMessages,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [initialMessages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isPending) return;

    startTransition(async () => {
      const result = await sendMessage(conversationId, text);
      if (!result.ok) {
        toastFormError(result.error);
        return;
      }
      setDraft("");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-[#F5F5F5] pb-mobile-public lg:min-h-screen lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <Link
          href="/messages"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100"
          aria-label="Back to messages"
        >
          <IconArrowLeft className="size-5" stroke={1.75} aria-hidden />
        </Link>
        <h1 className="truncate text-base font-semibold text-[#1C1C1A]">{storeName}</h1>
      </header>

      <div
        ref={listRef}
        className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {initialMessages.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            Say hello — your message will go directly to the store.
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

            const isMine = msg.senderId === currentUserId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isMine
                      ? "rounded-br-md bg-[#D4450A] text-white"
                      : "rounded-bl-md bg-white text-[#1C1C1A] ring-1 ring-zinc-200"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="px-1 text-[10px] text-zinc-400">{msg.timeLabel}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} aria-hidden />
      </div>

      <form
        onSubmit={handleSend}
        className="sticky bottom-0 border-t border-zinc-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto flex max-w-lg gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Write a message…"
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
