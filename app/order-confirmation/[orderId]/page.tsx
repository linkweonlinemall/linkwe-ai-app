import Link from "next/link";
import { redirect } from "next/navigation";

import PublicNav from "@/components/layout/PublicNav";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ orderId: string }> };

export default async function OrderConfirmationPage({ params }: Props) {
  const { orderId } = await params;
  if (!orderId?.trim()) {
    redirect("/");
  }

  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const order = await prisma.mainOrder.findFirst({
    where: { id: orderId, buyerId: session.userId },
    select: {
      id: true,
      referenceNumber: true,
      subtotalMinor: true,
      shippingMinor: true,
      totalMinor: true,
      items: {
        select: {
          id: true,
          titleSnapshot: true,
          priceMinor: true,
          quantity: true,
        },
      },
    },
  });

  if (!order) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <PublicNav />
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mb-8 flex flex-col items-center">
          <div
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--success-bg)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 className="mb-2 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Order Placed!
          </h1>

          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Thank you for shopping on LinkWe
          </p>

          {order.referenceNumber ? (
            <p className="mt-2 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Order #{order.referenceNumber}
            </p>
          ) : null}
        </div>

        <div
          className="mb-6 rounded-xl bg-white p-5 text-left"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Order Summary
          </h2>

          {order.items.map((item, idx) => (
            <div
              key={item.id}
              className="flex justify-between py-2 text-sm"
              style={
                idx < order.items.length - 1
                  ? { borderBottom: "1px solid var(--card-border-subtle)" }
                  : undefined
              }
            >
              <span className="min-w-0 pr-3" style={{ color: "var(--text-secondary)" }}>
                {item.titleSnapshot}
                <span className="text-zinc-400"> ×{item.quantity}</span>
              </span>
              <span className="shrink-0 font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                TTD {((item.priceMinor * item.quantity) / 100).toFixed(2)}
              </span>
            </div>
          ))}

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
              <span>Subtotal</span>
              <span className="tabular-nums">TTD {(order.subtotalMinor / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
              <span>Delivery</span>
              <span className="tabular-nums">TTD {(order.shippingMinor / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 font-bold" style={{ color: "var(--scarlet)" }}>
              <span>Total</span>
              <span className="tabular-nums">TTD {(order.totalMinor / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <Link
            href={`/orders/${order.id}`}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--scarlet)" }}
          >
            View Order
          </Link>
          <Link
            href="/"
            className="rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-50"
            style={{
              color: "var(--text-secondary)",
              borderColor: "var(--card-border)",
            }}
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
