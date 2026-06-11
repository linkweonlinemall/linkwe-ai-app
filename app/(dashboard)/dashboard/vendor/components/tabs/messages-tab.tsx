import Link from "next/link";
import { IconMessage } from "@tabler/icons-react";

import { getMyConversations } from "@/app/actions/messages";
import { formatConversationListTime } from "@/lib/messages/format-time";

function truncateSnippet(text: string | null, max = 80): string {
  if (!text) return "No messages yet";
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 3)}...`;
}

export default async function MessagesTab() {
  const result = await getMyConversations();

  if (!result.ok) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center">
        <p className="text-sm text-zinc-600">{result.error}</p>
      </div>
    );
  }

  if (result.side !== "vendor") {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center">
        <p className="text-sm text-zinc-600">
          Store inbox is only available to store owners.
        </p>
      </div>
    );
  }

  const now = new Date();
  const conversations = result.conversations;

  if (conversations.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
        <IconMessage
          className="mx-auto mb-4 size-10 text-zinc-300"
          stroke={1.25}
          aria-hidden
        />
        <p className="text-sm leading-relaxed text-zinc-600">
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
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:bg-zinc-50/80"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FEF0EB] text-sm font-bold text-[#D4450A]">
              {row.customerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-semibold text-[#1C1C1A]">{row.customerName}</p>
                <span className="shrink-0 text-xs text-zinc-400">
                  {formatConversationListTime(row.lastMessageAt, now)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-zinc-500">
                {truncateSnippet(row.lastMessageText)}
              </p>
            </div>
            {row.unread > 0 ? (
              <span className="flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded-full bg-[#D4450A] px-1.5 text-xs font-bold text-white">
                {row.unread > 99 ? "99+" : row.unread}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
