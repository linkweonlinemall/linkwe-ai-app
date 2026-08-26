import Link from "next/link";
import { IconMessage } from "@tabler/icons-react";

import { getMyConversations } from "@/app/actions/messages";
import { formatConversationListTime } from "@/lib/messages/format-time";

const CARD_BORDER = "border-[0.5px] border-[rgba(28,28,26,0.12)]";

function truncateSnippet(text: string | null, max = 72): string {
  if (!text) return "No messages yet";
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 3)}...`;
}

export default async function MessagesTab() {
  const result = await getMyConversations();

  if (!result.ok) {
    return (
      <div className={`rounded-[12px] bg-white px-4 py-8 text-center ${CARD_BORDER}`}>
        <p className="text-[13px] text-[#7c7b77]">{result.error}</p>
      </div>
    );
  }

  if (result.side !== "vendor") {
    return (
      <div className={`rounded-[12px] bg-white px-4 py-8 text-center ${CARD_BORDER}`}>
        <p className="text-[13px] text-[#7c7b77]">
          Store inbox is only available to store owners.
        </p>
      </div>
    );
  }

  const now = new Date();
  const conversations = result.conversations;

  if (conversations.length === 0) {
    return (
      <div className={`rounded-[12px] bg-white px-6 py-10 text-center ${CARD_BORDER}`}>
        <IconMessage
          className="mx-auto mb-3 size-9 text-[#d4d4d0]"
          stroke={1.25}
          aria-hidden
        />
        <p className="text-[13px] leading-relaxed text-[#7c7b77]">
          No messages yet. When customers message your store, they&apos;ll appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {conversations.map((row) => (
        <li key={row.id}>
          <Link
            href={`/dashboard/vendor/messages/${row.id}`}
            className={`group flex min-h-[82px] min-w-0 items-center gap-3 overflow-hidden rounded-2xl bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg sm:p-4 ${CARD_BORDER}`}
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50 text-sm font-black text-[#D4450A] shadow-inner ring-1 ring-orange-200/70"
            >
              {row.customerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-baseline justify-between gap-2">
                <p className="truncate text-[14px] font-bold text-[#1C1C1A]">
                  {row.customerName}
                </p>
                <span className="shrink-0 text-[11px] text-[#7c7b77]">
                  {formatConversationListTime(row.lastMessageAt, now)}
                </span>
              </div>
              <p className="mt-1 truncate text-[13px] text-[#7c7b77]">
                {truncateSnippet(row.lastMessageText)}
              </p>
            </div>
            {row.unread > 0 ? (
              <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-[#D4450A] px-1 text-[10px] font-semibold text-white">
                {row.unread > 99 ? "99+" : row.unread}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
