import type { Metadata } from "next";
import { redirect } from "next/navigation";


import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import PublicNav from "@/components/layout/PublicNav";
import styles from "@/components/customer/customer.module.css";
import { prisma } from "@/lib/prisma";

import OrdersClient from "./orders-client";

export const metadata: Metadata = {
  title: "My orders",
  description: "Track and manage your LinkWe orders.",
};

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userRecord = await prisma.user.findUnique({ where: { id: session.userId } });
  const continueHref = userRecord ? getRoleDashboardPath(userRecord.role) : null;

  const orders = await prisma.mainOrder.findMany({
    where: { buyerId: session.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      referenceNumber: true,
      createdAt: true,
      status: true,
      region: true,
      shippingAddressId: true,
      splitOrders: { select: { status: true } },
      subtotalMinor: true,
      shippingMinor: true,
      totalMinor: true,
      items: {
        select: {
          id: true,
          titleSnapshot: true,
          quantity: true,
          store: { select: { name: true, slug: true } },
          product: {
            select: {
              name: true,
              images: true,
              isDigital: true,
            },
          },
        },
      },
      _count: { select: { items: true } },
    },
  });

  return (
    <div className={`${styles.page} pb-mobile-public lg:pb-0`}>
      <PublicNav
        user={
          userRecord
            ? { name: userRecord.fullName ?? "Account", href: continueHref! }
            : null
        }
        dashboardHref={continueHref ?? undefined}
      />
      <main className={styles.container}><OrdersClient orders={orders} /></main>

      <footer className={styles.footer}>We people. We business. We local.</footer>
    </div>
  );
}
