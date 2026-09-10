import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IconMessage } from "@tabler/icons-react";

import { getAdminMessageRecipients, getAllConversations } from "@/app/actions/messages";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import MessageExport from "./message-export";
import ConversationInboxList from "@/components/messages/ConversationInboxList";
import NewMessage from "./new-message";

export const metadata: Metadata = {
  title: "Messages · Admin",
};

const CARD_BORDER = "border-[0.5px] border-[rgba(28,28,26,0.12)]";

export default async function AdminMessagesInboxPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "ADMIN");

  const [result,recipients] = await Promise.all([getAllConversations(),getAdminMessageRecipients()]);
  if (!result.ok) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-xl font-semibold text-[#1C1C1A]">Messages</h1>
        <p className="mt-4 text-[13px] text-[#7c7b77]">{result.error}</p>
      </div>
    );
  }

  const conversations = result.conversations;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
        <h1 className="text-xl font-semibold text-[#1C1C1A]">Messages</h1>
        <p className="mt-0.5 text-[13px] text-[#7c7b77]">
          All customer ↔ store conversations — {conversations.length} total
        </p>
        </div>
        <div className="flex flex-wrap gap-2">{recipients.ok&&<NewMessage people={recipients.people} stores={recipients.stores}/>}<a href="/api/admin/messages/export" className="inline-flex min-h-11 items-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold hover:border-orange-200">Export CSV</a></div>
      </div>

      <MessageExport/>
      {conversations.length === 0 ? (
        <div className={`rounded-[12px] bg-white px-6 py-10 text-center ${CARD_BORDER}`}>
          <IconMessage
            className="mx-auto mb-3 size-9 text-[#d4d4d0]"
            stroke={1.25}
            aria-hidden
          />
          <p className="text-[13px] text-[#7c7b77]">No conversations yet.</p>
        </div>
      ) : <ConversationInboxList conversations={conversations.map((row) => ({ id:row.id, name:`${row.customerName} ↔ ${row.storeName}`, lastMessageText:row.lastMessageText, lastMessageAt:row.lastMessageAt, unread:row.customerUnread + row.storeUnread, lastSeenAt:[row.customerLastSeenAt,row.vendorLastSeenAt].filter((date): date is Date => !!date).sort((a,b)=>b.getTime()-a.getTime())[0] ?? null, href:`/dashboard/admin/messages/${row.id}` }))}/>}
    </div>
  );
}
