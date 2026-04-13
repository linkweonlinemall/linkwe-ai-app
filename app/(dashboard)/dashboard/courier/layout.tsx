import { unstable_noStore as noStore } from "next/cache";
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

  return <CourierRouteGuard courierOnboardingStep={user.courierOnboardingStep}>{children}</CourierRouteGuard>;
}
