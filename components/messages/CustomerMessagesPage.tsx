import { notFound, redirect } from "next/navigation";
import { getMyConversations, getConversationMessages } from "@/app/actions/messages";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import s from "./customer-messages.module.css";
import PublicNav from "@/components/layout/PublicNav";
import VendorMessagesWorkspace from "@/components/vendor/messages/VendorMessagesWorkspace";
import { getRoleDashboardPath } from "@/lib/auth/redirects";

export default async function CustomerMessagesPage({ conversationId }: { conversationId?: string }) {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=%2Fmessages");
  const [user, inbox] = await Promise.all([prisma.user.findUnique({where:{id:session.userId},select:{fullName:true,role:true}}), getMyConversations()]);
  if (!inbox.ok) throw new Error(inbox.error);
  if (inbox.side === "vendor") redirect(`/dashboard/vendor/messages${conversationId ? `/${conversationId}` : ""}`);
  if (conversationId && !inbox.conversations.some(row => row.id === conversationId)) notFound();
  const thread = conversationId ? await getConversationMessages(conversationId, false) : null;
  if (thread && !thread.ok) notFound();
  const dashboardHref = getRoleDashboardPath(user?.role ?? "CUSTOMER");
  return <div className={s.page}><PublicNav user={{name:user?.fullName ?? "Account",href:dashboardHref}} dashboardHref={dashboardHref}/><main className={s.main}><VendorMessagesWorkspace key={conversationId ?? "inbox"} side="customer" currentUserId={session.userId} selectedId={conversationId ?? null} initialRows={inbox.conversations.map(row => ({...row,customerName:row.storeName,lastMessageAt:row.lastMessageAt.toISOString(),lastSeenAt:row.lastSeenAt?.toISOString() ?? null}))} initialMessages={thread?.ok ? thread.messages.map(message => ({...message,createdAt:message.createdAt.toISOString()})) : []} initialSnapshotAt={thread?.ok ? thread.snapshotAt.toISOString() : null} context={null} renderedAt={new Date().toISOString()}/></main></div>;
}
