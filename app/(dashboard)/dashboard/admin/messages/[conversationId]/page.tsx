import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getAllConversations,
  getConversationMessages,
} from "@/app/actions/messages";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import { formatMessageTimestamp } from "@/lib/messages/format-time";

import AdminMessageThread, {
  type AdminThreadMessage,
} from "./AdminMessageThread";

type Props = { params: Promise<{ conversationId: string }> };

export const metadata: Metadata = {
  title: "Conversation · Admin Messages",
};

export default async function AdminMessageThreadPage({ params }: Props) {
  const { conversationId } = await params;

  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "ADMIN");

  const [messagesResult, listResult] = await Promise.all([
    getConversationMessages(conversationId),
    getAllConversations(),
  ]);

  if (!messagesResult.ok) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-bold text-[#1C1C1A]">Not authorized</h1>
        <p className="mt-2 text-sm text-zinc-600">
          You don&apos;t have access to this conversation.
        </p>
        <Link
          href="/dashboard/admin/messages"
          className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#D4450A] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Back to messages
        </Link>
      </div>
    );
  }

  let customerName = "Customer";
  let storeName = "Store";
  if (listResult.ok) {
    const match = listResult.conversations.find((c) => c.id === conversationId);
    if (match) {
      customerName = match.customerName;
      storeName = match.storeName;
    }
  }

  const initialMessages: AdminThreadMessage[] = messagesResult.messages.map((msg) => ({
    id: msg.id,
    senderRole: msg.senderRole,
    content: msg.content,
    timeLabel: formatMessageTimestamp(msg.createdAt),
  }));

  return (
    <AdminMessageThread
      conversationId={conversationId}
      customerName={customerName}
      storeName={storeName}
      initialMessages={initialMessages}
    />
  );
}
