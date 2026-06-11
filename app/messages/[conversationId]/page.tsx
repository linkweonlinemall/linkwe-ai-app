import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getConversationMessages,
  getMyConversations,
} from "@/app/actions/messages";
import PublicNav from "@/components/layout/PublicNav";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { formatMessageTimestamp } from "@/lib/messages/format-time";
import { prisma } from "@/lib/prisma";

import { MessageThread, type ThreadMessage } from "./MessageThread";

type Props = { params: Promise<{ conversationId: string }> };

export const metadata: Metadata = {
  title: "Conversation",
  description: "Message a store on LinkWe.",
};

export default async function MessageThreadPage({ params }: Props) {
  const { conversationId } = await params;

  const session = await getSession();
  if (!session) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/messages/${conversationId}`)}`,
    );
  }

  const userRecord = await prisma.user.findUnique({ where: { id: session.userId } });
  const continueHref = userRecord ? getRoleDashboardPath(userRecord.role) : null;

  const [messagesResult, listResult] = await Promise.all([
    getConversationMessages(conversationId),
    getMyConversations(),
  ]);

  if (!messagesResult.ok) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
        <PublicNav
          user={
            userRecord
              ? { name: userRecord.fullName ?? "Account", href: continueHref! }
              : null
          }
          dashboardHref={continueHref ?? undefined}
        />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-bold text-[#1C1C1A]">Not authorized</h1>
          <p className="mt-2 text-sm text-zinc-600">
            You don&apos;t have access to this conversation.
          </p>
          <Link
            href="/messages"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#D4450A] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Back to messages
          </Link>
        </div>
      </div>
    );
  }

  let storeName = "Store";
  if (listResult.ok && listResult.side === "customer") {
    const match = listResult.conversations.find((c) => c.id === conversationId);
    if (match) storeName = match.storeName;
  }

  const initialMessages: ThreadMessage[] = messagesResult.messages.map((msg) => ({
    id: msg.id,
    senderId: msg.senderId,
    senderRole: msg.senderRole,
    content: msg.content,
    timeLabel: formatMessageTimestamp(msg.createdAt),
  }));

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <PublicNav
        user={
          userRecord
            ? { name: userRecord.fullName ?? "Account", href: continueHref! }
            : null
        }
        dashboardHref={continueHref ?? undefined}
      />
      <MessageThread
        conversationId={conversationId}
        storeName={storeName}
        currentUserId={session.userId}
        initialMessages={initialMessages}
      />
    </div>
  );
}
