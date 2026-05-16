import { getPublicServices } from "@/app/actions/services";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import PublicNav from "@/components/layout/PublicNav";
import { prisma } from "@/lib/prisma";

import ServicesClient from "./ServicesClient";

export default async function ServicesPage() {
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;

  const services = await getPublicServices({});

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 sm:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
      />
      <ServicesClient initialServices={services} />
    </div>
  );
}
