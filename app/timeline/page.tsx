import { redirect } from "next/navigation";
import { getTimelineFeed } from "@/app/actions/business-timeline";
import TimelineClient from "./timeline-client";
import PublicNav from "@/components/layout/PublicNav";
import { prisma } from "@/lib/prisma";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";

export default async function TimelinePage() {
  const data = await getTimelineFeed();
  if (!data.session) redirect("/login?callbackUrl=/timeline");
  const [user, unreadCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: data.session.userId }, select: { fullName: true, role: true } }),
    getNavUnreadCount(),
  ]);
  const dashboardHref = user ? getRoleDashboardPath(user.role) : "/dashboard";
  return <div className="min-h-screen bg-[#F7F5F2] pb-mobile-public"><PublicNav user={user ? { name: user.fullName, href: dashboardHref } : null} dashboardHref={dashboardHref} unreadCount={unreadCount} /><TimelineClient posts={JSON.parse(JSON.stringify(data.posts))} /></div>;
}
