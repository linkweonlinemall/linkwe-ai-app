import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAllConversations } from "@/app/actions/messages";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import { formatConversationListTime } from "@/lib/messages/format-time";

export const metadata: Metadata = {
  title: "Messages · Admin",
};

function truncateSnippet(text: string | null, max = 80): string {
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
        <h1 className="text-2xl font-bold text-zinc-900">Messages</h1>
        <p className="mt-4 text-sm text-zinc-600">{result.error}</p>
      </div>
    );
  }

  const now = new Date();
  const conversations = result.conversations;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Messages</h1>
        <p className="mt-1 text-sm text-zinc-500">
          All customer ↔ store conversations — {conversations.length} total
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-zinc-600">No conversations yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {conversations.map((row) => (
            <li key={row.id}>
              <Link
                href={`/dashboard/admin/messages/${row.id}`}
                className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:bg-zinc-50/80"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-semibold text-[#1C1C1A]">
                      {row.customerName}
                      <span className="mx-1.5 font-normal text-zinc-400">↔</span>
                      {row.storeName}
                    </p>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {formatConversationListTime(row.lastMessageAt, now)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-zinc-500">
                    {truncateSnippet(row.lastMessageText)}
                  </p>
                  {(row.customerUnread > 0 || row.storeUnread > 0) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {row.customerUnread > 0 ? (
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                          Customer unread: {row.customerUnread}
                        </span>
                      ) : null}
                      {row.storeUnread > 0 ? (
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                          Store unread: {row.storeUnread}
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
