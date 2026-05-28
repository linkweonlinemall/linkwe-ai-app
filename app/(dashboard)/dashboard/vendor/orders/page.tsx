import Link from "next/link";
import { redirect } from "next/navigation";

import OrdersTab from "@/app/(dashboard)/dashboard/vendor/components/tabs/orders-tab";
import { getSession } from "@/lib/auth/session";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { prisma } from "@/lib/prisma";
import { vendorSplitOrderListSelect } from "@/lib/vendor/vendor-split-order-query";

export default async function VendorOrdersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) redirect("/onboarding/business/step-3");

  const splitOrders = await prisma.splitOrder.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    select: vendorSplitOrderListSelect,
  });

  const count = splitOrders.length;

  return (
    <div className="px-6 py-8">
      <Link
        href="/dashboard/vendor"
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Back to dashboard
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Orders
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            Manage and fulfil customer orders · {count} {count === 1 ? "order" : "orders"}
          </p>
        </div>
      </div>

      <OrdersTab splitOrders={splitOrders} />
    </div>
  );
}
