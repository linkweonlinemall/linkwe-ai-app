import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import AdminShell from "./components/admin-shell";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  const [unreadCount, verificationCount, payoutCount, orderCount] = await Promise.all([
    prisma.notification.count({ where: { userId: session.userId, isRead: false } }),
    prisma.user.count({ where: { role: "VENDOR", idVerificationStatus: "PENDING" } }),
    prisma.payoutRequest.count({ where: { status: "PENDING" } }),
    prisma.splitOrder.count({ where: { status: { in: ["AWAITING_VENDOR_ACTION", "READY_FOR_LINKWE", "AWAITING_COURIER_PICKUP"] } } }),
  ]);

  return (
    <Suspense fallback={null}>
      <AdminShell adminName={session.fullName ?? "Admin"} unreadCount={unreadCount} attentionCounts={{ verification: verificationCount, payouts: payoutCount, orders: orderCount }}>
        {children}
      </AdminShell>
    </Suspense>
  );
}
