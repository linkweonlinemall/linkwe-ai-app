import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getConversationMessages,
  getMyConversations,
} from "@/app/actions/messages";
import { MessageThread, type ThreadMessage } from "@/app/messages/[conversationId]/MessageThread";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import { formatMessageTimestamp } from "@/lib/messages/format-time";

type Props = { params: Promise<{ conversationId: string }> };

export const metadata: Metadata = {
  title: "Conversation · Vendor Messages",
};

export default async function VendorMessageThreadPage({ params }: Props) {
  const { conversationId } = await params;

  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");

  const [messagesResult, listResult] = await Promise.all([
    getConversationMessages(conversationId),
    getMyConversations(),
  ]);

  if (!messagesResult.ok) {
    return (
      <div className="px-6 py-8">
        <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <h1 className="text-xl font-bold text-[#1C1C1A]">Not authorized</h1>
          <p className="mt-2 text-sm text-zinc-600">
            You don&apos;t have access to this conversation.
          </p>
          <Link
            href="/dashboard/vendor/messages"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#D4450A] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Back to messages
          </Link>
        </div>
      </div>
    );
  }

  let customerName = "Customer";
  if (listResult.ok && listResult.side === "vendor") {
    const match = listResult.conversations.find((c) => c.id === conversationId);
    if (match) customerName = match.customerName;
  }

  const initialMessages: ThreadMessage[] = messagesResult.messages.map((msg) => ({
    id: msg.id,
    senderId: msg.senderId,
    senderRole: msg.senderRole,
    content: msg.content,
    timeLabel: formatMessageTimestamp(msg.createdAt),
  }));

  return (
    <div className="-mx-6 -mb-8 flex min-h-[calc(100dvh-8rem)] flex-col md:-mx-8">
      <MessageThread
        conversationId={conversationId}
        headerTitle={customerName}
        backHref="/dashboard/vendor/messages"
        currentUserId={session.userId}
        initialMessages={initialMessages}
        emptyHint="No messages in this conversation yet."
        shellClassName="min-h-0 flex-1 flex-col bg-[#F5F5F5]"
      />
    </div>
  );
}
