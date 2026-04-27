import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { prisma } from "@/lib/prisma";

export default async function CustomerDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "CUSTOMER");

  const orders = await prisma.mainOrder.findMany({
    where: { buyerId: session.userId },
    select: {
      id: true,
      referenceNumber: true,
      createdAt: true,
      status: true,
      totalMinor: true,
      items: {
        take: 1,
        select: {
          titleSnapshot: true,
          product: { select: { images: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const cartCount = await prisma.productCartItem.count({
    where: { userId: session.userId },
  });

  const thumb = (o: (typeof orders)[0]) => o.items[0]?.product?.images?.[0];

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">
            Welcome back, {session.fullName?.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Here's what's happening with your account</p>
        </div>

        {/* Quick actions */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Shop with AI", href: "/chat", icon: "🤖", desc: "Find products" },
            { label: "Browse shop", href: "/shop", icon: "🛍️", desc: "All products" },
            {
              label: "Your cart",
              href: "/cart",
              icon: "🛒",
              desc: `${cartCount} item${cartCount !== 1 ? "s" : ""}`,
            },
            {
              label: "Your orders",
              href: "/orders",
              icon: "📦",
              desc: `${orders.length} order${orders.length !== 1 ? "s" : ""}`,
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl bg-white p-4 text-center shadow-sm
                transition-all hover:shadow-md"
            >
              <div className="mb-2 text-3xl">{item.icon}</div>
              <p className="text-sm font-semibold text-zinc-900">{item.label}</p>
              <p className="mt-0.5 text-xs text-zinc-400">{item.desc}</p>
            </Link>
          ))}
        </div>

        {/* Recent orders */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900">Recent orders</h2>
            <Link href="/orders" className="text-xs text-[#D4450A] hover:underline">
              View all →
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="py-10 text-center">
              <p className="mb-3 text-3xl">🛒</p>
              <p className="mb-4 text-sm text-zinc-500">No orders yet</p>
              <Link
                href="/shop"
                className="rounded-lg bg-[#D4450A] px-4 py-2
                  text-sm text-white hover:opacity-90"
              >
                Start shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-4 rounded-lg p-3
                    transition-colors hover:bg-zinc-50"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                    {thumb(order) ? (
                      <img
                        src={thumb(order)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-zinc-300">📦</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900">Order #{order.referenceNumber}</p>
                    <p className="text-xs text-zinc-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-zinc-900">
                      TTD {(order.totalMinor / 100).toFixed(2)}
                    </p>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium
                      ${
                        order.status === "DELIVERED"
                          ? "bg-green-100 text-green-700"
                          : order.status === "CANCELLED"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
