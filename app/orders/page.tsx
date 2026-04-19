import Link from "next/link";
import { redirect } from "next/navigation";

import PublicNav from "@/components/layout/PublicNav";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import OrdersClient from "./orders-client";

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const orders = await prisma.mainOrder.findMany({
    where: { buyerId: session.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
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
    <div className="min-h-screen bg-[#f5f5f5]">
      <PublicNav />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">My Orders</h1>
          <Link
            href="/"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
          >
            Continue shopping
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-4 text-zinc-300"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <p className="text-lg font-semibold text-zinc-900">No orders yet</p>
            <p className="mt-2 text-sm text-zinc-500">
              Your completed purchases will appear here.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: "#D4450A" }}
            >
              Browse stores
            </Link>
          </div>
        ) : (
          <OrdersClient orders={orders} />
        )}
      </div>
    </div>
  );
}
