import {redirect} from "next/navigation";
import {getSession} from "@/lib/auth/session";
import {getRoleDashboardPath} from "@/lib/auth/redirects";
import PublicNav from "@/components/layout/PublicNav";
import NotificationCentre from "@/components/notifications/NotificationCentre";
import {getNavUnreadCount} from "@/lib/notifications/get-unread-count";
export const metadata={title:"Your notifications",description:"Keep up with your orders, bookings, messages and account updates."};
export default async function NotificationsPage(){const session=await getSession();if(!session)redirect("/login?next=/notifications");const href=getRoleDashboardPath(session.role);return <><PublicNav user={{name:session.fullName??"Account",href}} dashboardHref={href} unreadCount={await getNavUnreadCount()}/><NotificationCentre/></>;}
