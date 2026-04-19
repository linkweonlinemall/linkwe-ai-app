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
      totalMinor: true,
    },
  });

  if (!order) {
    redirect("/");
  }

  const totalTtd = order.totalMinor / 100;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <PublicNav />
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="flex justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-500"
            aria-hidden
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-zinc-900">Order confirmed!</h1>
        <p className="mt-2 text-xs text-zinc-500">Order ID: {order.id}</p>
        <p className="mt-4 text-sm text-zinc-600">
          Thank you for your purchase. The vendor will be in touch shortly.
        </p>
        <p className="mt-6 text-lg font-semibold text-zinc-900">
          Total paid: TTD {totalTtd.toFixed(2)}
        </p>
        <div className="mt-10 flex flex-col flex-wrap items-stretch justify-center gap-3 sm:flex-row">
          <a
            href={`/api/invoice/${order.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
          >
            Download Invoice
          </a>
          <Link
            href={`/orders/${order.id}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#D4450A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#B83A08]"
          >
            View Order
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-medium text-white"
            style={{ backgroundColor: "#D4450A" }}
          >
            Continue shopping
          </Link>
          <Link
            href="/orders"
            className="inline-flex h-11 items-center justify-center rounded-xl border-2 border-zinc-300 px-6 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            View all orders
          </Link>
        </div>
      </div>
    </div>
  );
}
