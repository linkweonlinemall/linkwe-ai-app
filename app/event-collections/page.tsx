import PublicNav from "@/components/layout/PublicNav";
import { getSession } from "@/lib/auth/session";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";
import EventCollectionsClient from "./EventCollectionsClient";

export default async function EventCollectionsPage(){const session=await getSession();const user=session?await prisma.user.findUnique({where:{id:session.userId}}):null;const href=user?getRoleDashboardPath(user.role):null;const unread=await getNavUnreadCount();return <div className="min-h-screen bg-[#F7F5F2] pb-mobile-public"><PublicNav user={user?{name:user.fullName??"Account",href:href!}:null} dashboardHref={href??undefined} unreadCount={unread}/><main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10"><section className="mb-7 overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_85%_0%,rgba(242,138,45,.38),transparent_32%),linear-gradient(135deg,#171715,#43200f)] p-6 text-white shadow-2xl sm:p-9"><p className="text-[10px] font-black uppercase tracking-[.22em] text-orange-300">Your plans</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Event Collections</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Keep the events you love organised in a visual calendar.</p></section><EventCollectionsClient/></main></div>}
