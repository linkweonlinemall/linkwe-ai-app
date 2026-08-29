import { getPublicServices } from "@/app/actions/services";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import PublicNav from "@/components/layout/PublicNav";
import { prisma } from "@/lib/prisma";

import ServicesClient from "./ServicesClient";
import { getWishlistProductIds } from "@/app/actions/wishlist";

export default async function ServicesPage() {
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;

  const unreadCount = await getNavUnreadCount();

  const [services, wishlistProductIds] = await Promise.all([getPublicServices({}), getWishlistProductIds()]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
        unreadCount={unreadCount}
      />
      <ServicesClient initialServices={services} wishlistProductIds={wishlistProductIds} />
    </div>
  );
}
