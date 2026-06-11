import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconMessage } from "@tabler/icons-react";

import { getAllConversations } from "@/app/actions/messages";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import { formatConversationListTime } from "@/lib/messages/format-time";

export const metadata: Metadata = {
  title: "Messages · Admin",
};

const CARD_BORDER = "border-[0.5px] border-[rgba(28,28,26,0.12)]";

function truncateSnippet(text: string | null, max = 72): string {
  if (!text) return "No messages yet";
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 3)}...`;
}

export default async function AdminMessagesInboxPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "ADMIN");

  const result = await getAllConversations();
  if (!result.ok) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-xl font-semibold text-[#1C1C1A]">Messages</h1>
        <p className="mt-4 text-[13px] text-[#7c7b77]">{result.error}</p>
      </div>
    );
  }

  const now = new Date();
  const conversations = result.conversations;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-[#1C1C1A]">Messages</h1>
        <p className="mt-0.5 text-[13px] text-[#7c7b77]">
          All customer ↔ store conversations — {conversations.length} total
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className={`rounded-[12px] bg-white px-6 py-10 text-center ${CARD_BORDER}`}>
          <IconMessage
            className="mx-auto mb-3 size-9 text-[#d4d4d0]"
            stroke={1.25}
            aria-hidden
          />
          <p className="text-[13px] text-[#7c7b77]">No conversations yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {conversations.map((row) => (
            <li key={row.id}>
              <Link
                href={`/dashboard/admin/messages/${row.id}`}
                className={`flex min-h-[64px] items-center gap-3 rounded-[12px] bg-white p-3 transition-colors hover:bg-[#FAFAF9] ${CARD_BORDER}`}
              >
                <div className="flex shrink-0 -space-x-2">
                  <div
                    className={`relative z-[1] flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#FEF0EB] text-[11px] font-semibold text-[#D4450A]`}
                  >
                    {row.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#f5f5f5] text-[11px] font-semibold text-[#1C1C1A] ${CARD_BORDER}`}
                  >
                    {row.storeName.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <p className="text-[14px] font-medium text-[#1C1C1A]">
                      {row.customerName}
                      <span className="mx-1.5 font-normal text-[#7c7b77]">↔</span>
                      {row.storeName}
                    </p>
                    <span className="shrink-0 text-[11px] text-[#7c7b77]">
                      {formatConversationListTime(row.lastMessageAt, now)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-[#7c7b77]">
                    {truncateSnippet(row.lastMessageText)}
                  </p>
                  {(row.customerUnread > 0 || row.storeUnread > 0) && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {row.customerUnread > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF0EB] px-2 py-0.5 text-[10px] font-medium text-[#D4450A]">
                          Customer
                          <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#D4450A] px-1 text-[9px] font-semibold text-white">
                            {row.customerUnread > 9 ? "9+" : row.customerUnread}
                          </span>
                        </span>
                      ) : null}
                      {row.storeUnread > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF0EB] px-2 py-0.5 text-[10px] font-medium text-[#D4450A]">
                          Store
                          <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#D4450A] px-1 text-[9px] font-semibold text-white">
                            {row.storeUnread > 9 ? "9+" : row.storeUnread}
                          </span>
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
