"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { IconArrowLeft } from "@tabler/icons-react";

import { getConversationMessages, sendMessage } from "@/app/actions/messages";
import { toastFormError } from "@/lib/feedback/toasts";
import { formatMessageTimestamp } from "@/lib/messages/format-time";

export type ThreadMessage = {
  id: string;
  senderId: string;
  senderRole: string;
  content: string;
  timeLabel: string;
};

type Props = {
  conversationId: string;
  headerTitle: string;
  backHref?: string;
  currentUserId: string;
  initialMessages: ThreadMessage[];
  emptyHint?: string;
  shellClassName?: string;
};

const CARD_BORDER = "border-[0.5px] border-[rgba(28,28,26,0.12)]";

function isNearBottom(el: HTMLElement, threshold = 80): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

function messagesEqual(a: ThreadMessage[], b: ThreadMessage[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (msg, i) =>
      msg.id === b[i]?.id &&
      msg.content === b[i]?.content &&
      msg.senderId === b[i]?.senderId &&
      msg.senderRole === b[i]?.senderRole,
  );
}

export function MessageThread({
  conversationId,
  headerTitle,
  backHref = "/messages",
  currentUserId,
  initialMessages,
  emptyHint = "Say hello — your message will go directly to the store.",
  shellClassName = "min-h-[calc(100dvh-4rem)] flex-col bg-[#F7F5F5] pb-mobile-public lg:min-h-screen lg:pb-0",
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);
  const scrollAfterSend = useRef(false);

  function scrollListToBottom(behavior: ScrollBehavior = "auto") {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }

  useEffect(() => {
    setMessages(initialMessages);

    if (!didInitialScroll.current) {
      didInitialScroll.current = true;
      requestAnimationFrame(() => scrollListToBottom("auto"));
      return;
    }

    if (scrollAfterSend.current) {
      scrollAfterSend.current = false;
      requestAnimationFrame(() => scrollListToBottom("auto"));
    }
  }, [initialMessages]);

  useEffect(() => {
    async function pollMessages() {
      const result = await getConversationMessages(conversationId);
      if (!result.ok) return;

      const nextMessages: ThreadMessage[] = result.messages.map((msg) => ({
        id: msg.id,
        senderId: msg.senderId,
        senderRole: msg.senderRole,
        content: msg.content,
        timeLabel: formatMessageTimestamp(msg.createdAt),
      }));

      const listEl = listRef.current;
      const stickToBottom = listEl ? isNearBottom(listEl) : true;

      setMessages((prev) => {
        if (messagesEqual(prev, nextMessages)) return prev;
        return nextMessages;
      });

      if (!stickToBottom) return;

      requestAnimationFrame(() => scrollListToBottom("smooth"));
    }

    const id = window.setInterval(() => void pollMessages(), 5_000);
    return () => window.clearInterval(id);
  }, [conversationId]);

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
      scrollAfterSend.current = true;
      router.refresh();
    });
  }

  return (
    <div className={`flex min-w-0 max-w-full overflow-hidden ${shellClassName}`}>
      <header
        className="sticky top-0 z-10 flex items-center gap-3 border-b border-orange-100 bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-xl sm:px-4 sm:py-3"
      >
        <Link
          href={backHref}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] text-[#7c7b77] transition-colors hover:bg-[#F7F5F2] hover:text-[#1C1C1A]"
          aria-label="Back to messages"
        >
          <IconArrowLeft className="size-5" stroke={1.75} aria-hidden />
        </Link>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 to-amber-50 text-xs font-black text-[#D4450A] ring-1 ring-orange-200">{headerTitle.charAt(0).toUpperCase()}</div>
        <div className="min-w-0"><h1 className="truncate text-[15px] font-bold text-[#1C1C1A]">{headerTitle}</h1><p className="text-[10px] font-medium text-emerald-600">Conversation active</p></div>
      </header>

      <div
        ref={listRef}
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-2 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.08),transparent_32%)] px-3 py-4 sm:px-5 sm:py-6"
      >
        {messages.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-[#7c7b77]">{emptyHint}</p>
        ) : (
          messages.map((msg) => {
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

            const isMine = msg.senderId === currentUserId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-0.5 py-0.5 ${isMine ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[84%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm sm:max-w-[72%] ${
                    isMine
                      ? "rounded-br-sm bg-[#D4450A] text-white"
                      : `rounded-bl-sm bg-[#f5f5f5] text-[#1C1C1A] ${CARD_BORDER}`
                  }`}
                >
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
        className="sticky bottom-0 z-20 border-t border-orange-100 bg-white/95 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl sm:px-4 sm:py-3"
      >
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={1}
            placeholder="Write a message…"
            className={`min-h-[40px] max-h-28 min-w-0 flex-1 resize-none rounded-[10px] bg-white px-3 py-2 text-[13px] text-[#1C1C1A] outline-none focus:border-[#D4450A] focus:ring-1 focus:ring-[#D4450A]/30 ${CARD_BORDER}`}
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
