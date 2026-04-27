import Link from "next/link";
import { redirect } from "next/navigation";

import PublicNav from "@/components/layout/PublicNav";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import OrdersClient from "./orders-client";

function getDashboardPath(role: string) {
  if (role === "VENDOR") return "/dashboard/vendor";
  if (role === "COURIER") return "/dashboard/courier";
  if (role === "ADMIN") return "/dashboard/admin";
  return "/dashboard/customer";
}

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userRecord = await prisma.user.findUnique({ where: { id: session.userId } });
  const continueHref = userRecord ? getDashboardPath(userRecord.role) : null;

  const orders = await prisma.mainOrder.findMany({
    where: { buyerId: session.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      referenceNumber: true,
      createdAt: true,
      status: true,
      region: true,
      subtotalMinor: true,
      shippingMinor: true,
      totalMinor: true,
      items: {
        take: 3,
        select: {
          id: true,
          titleSnapshot: true,
          product: {
            select: {
              name: true,
              images: true,
            },
          },
        },
      },
      _count: { select: { items: true } },
    },
  });

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <PublicNav
        user={
          userRecord
            ? { name: userRecord.fullName ?? "Account", href: continueHref! }
            : null
        }
        dashboardHref={continueHref ?? undefined}
      />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            My Orders
          </h1>
          <Link href="/" className="text-sm hover:underline" style={{ color: "var(--blue)" }}>
            Continue shopping
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mb-4 text-4xl">📦</p>
            <h2 className="mb-2 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              No orders yet
            </h2>
            <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
              Your orders will appear here once you make a purchase
            </p>
            <Link
              href="/"
              className="inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--scarlet)" }}
            >
              Start shopping →
            </Link>
          </div>
        ) : (
          <OrdersClient orders={orders} />
        )}
      </div>

      <footer
        className="mt-12 py-6 text-center"
        style={{ borderTop: "1px solid var(--card-border-subtle)" }}
      >
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          <a href="/" style={{ color: "var(--scarlet)" }}>
            LinkWe
          </a>{" "}
          — Trinidad & Tobago&apos;s Marketplace
        </p>
      </footer>
    </div>
  );
}
