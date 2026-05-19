import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import { CourierRouteGuard } from "./courier-route-guard";

export default async function CourierDashboardLayout({ children }: { children: React.ReactNode }) {
  noStore();

  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, courierOnboardingStep: true },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "COURIER") {
    redirect(getRoleDashboardPath(user.role));
  }

  return (
    <>
      <nav className="flex justify-end gap-4 border-b border-zinc-200 bg-white px-4 py-2.5 text-sm md:px-6">
        <Link href="/dashboard/courier" className="font-medium text-zinc-700 hover:text-zinc-900">
          Dashboard
        </Link>
        <Link
          href="/dashboard/courier/settings"
          className="font-medium text-zinc-700 hover:text-zinc-900"
        >
          Settings
        </Link>
      </nav>
      <CourierRouteGuard courierOnboardingStep={user.courierOnboardingStep}>
        {children}
      </CourierRouteGuard>
    </>
  );
}
