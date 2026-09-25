import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMyConversations, getConversationMessages } from "@/app/actions/messages";
import { getSession } from "@/lib/auth/session";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getVendorMessageContext } from "@/lib/vendor/message-context";
import VendorMessagesWorkspace from "./VendorMessagesWorkspace";
import s from "./messages.module.css";

export default async function VendorMessagesPage({ conversationId }: { conversationId?: string }) {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");
  const inbox = await getMyConversations();
  if (!inbox.ok || inbox.side !== "vendor") return <div className={s.unavailable}><h1>Your store inbox</h1><p>{!inbox.ok ? inbox.error : "Complete your store setup to start talking with customers."}</p><Link href="/dashboard/vendor">Back to dashboard</Link></div>;
  // Check store ownership before reading the thread or related customer records.
  if (conversationId && !inbox.conversations.some(row => row.id === conversationId)) notFound();
  const [thread, context] = conversationId ? await Promise.all([
    getConversationMessages(conversationId, false), getVendorMessageContext(conversationId, session.userId),
  ]) : [null, null];
  if (thread && !thread.ok) notFound();
  return <VendorMessagesWorkspace
    key={conversationId ?? "inbox"}
    currentUserId={session.userId}
    selectedId={conversationId ?? null}
    initialRows={inbox.conversations.map(row => ({ ...row, lastMessageAt: row.lastMessageAt.toISOString(), lastSeenAt: row.lastSeenAt?.toISOString() ?? null }))}
    initialMessages={thread?.ok ? thread.messages.map(message => ({ ...message, createdAt: message.createdAt.toISOString() })) : []}
    initialSnapshotAt={thread?.ok ? thread.snapshotAt.toISOString() : null}
    context={context}
    renderedAt={new Date().toISOString()}
  />;
}
