import Link from "next/link";
import { IconMessage } from "@tabler/icons-react";

import { getMyConversations } from "@/app/actions/messages";
import { formatConversationListTime } from "@/lib/messages/format-time";
import ConversationInboxList from "@/components/messages/ConversationInboxList";

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
    <ConversationInboxList conversations={conversations.map((row) => ({ id: row.id, name: row.customerName, lastMessageText: row.lastMessageText, lastMessageAt: row.lastMessageAt, unread: row.unread, href: `/dashboard/vendor/messages/${row.id}` }))} />
  );
}
