import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import AdminShell from "./components/admin-shell";
import { prisma } from "@/lib/prisma";
import { getVendorReadiness } from "@/lib/vendor/readiness";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  const [unreadCount, verificationCandidates, payoutCount, orderCount] = await Promise.all([
    prisma.notification.count({ where: { userId: session.userId, isRead: false } }),
    prisma.user.findMany({ where: { role: "VENDOR", idVerificationStatus: "PENDING" }, select: { idDocumentUrl: true, selfieWithIdUrl: true, phone: true, bankDetails: { select: { bankName: true, accountName: true, accountNumber: true } }, storesOwned: { take: 1, select: { logoUrl: true, description: true } } } }),
    prisma.payoutRequest.count({ where: { status: "PENDING" } }),
    prisma.splitOrder.count({ where: { status: { in: ["AWAITING_VENDOR_ACTION", "READY_FOR_LINKWE", "AWAITING_COURIER_PICKUP"] } } }),
  ]);
  const verificationCount = verificationCandidates.filter((vendor) => getVendorReadiness({ idDocumentUrl: vendor.idDocumentUrl, selfieWithIdUrl: vendor.selfieWithIdUrl, phone: vendor.phone, bankDetails: vendor.bankDetails, store: vendor.storesOwned[0] ?? null }).ready).length;

  return (
    <Suspense fallback={null}>
      <AdminShell adminName={session.fullName ?? "Admin"} unreadCount={unreadCount} attentionCounts={{ verification: verificationCount, payouts: payoutCount, orders: orderCount }}>
        {children}
      </AdminShell>
    </Suspense>
  );
}
