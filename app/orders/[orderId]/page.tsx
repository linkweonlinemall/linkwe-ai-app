import { Fragment } from "react";
import { notFound, redirect } from "next/navigation";

import PublicNav from "@/components/layout/PublicNav";
import { getSession } from "@/lib/auth/session";
import {
  getProgressStep,
  getStatusInfo,
  ORDER_PROGRESS_STEPS,
} from "@/lib/orders/order-status";
import { generateOrderQRCodeDataURL, getOrderUrl } from "@/lib/orders/qr-code";
import { prisma } from "@/lib/prisma";
import type { MainOrderStatus } from "@prisma/client";

type Props = { params: Promise<{ orderId: string }> };

function badgeClasses(status: MainOrderStatus): string {
  const { color } = getStatusInfo(status);
  switch (color) {
    case "blue":
      return "bg-blue-100 text-blue-800";
    case "emerald":
      return "bg-emerald-100 text-emerald-800";
    case "red":
      return "bg-red-100 text-red-800";
    case "amber":
      return "bg-amber-100 text-amber-900";
    case "scarlet":
      return "bg-[#fff5f0] text-[#D4450A]";
    case "zinc":
    default:
      return "bg-zinc-100 text-zinc-800";
  }
}

function formatOrderDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-TT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getSplitOrderStatusLabel(status: string): { label: string; className: string } {
  switch (status) {
    case "AWAITING_VENDOR_ACTION":
      return { label: "Action Required", className: "bg-red-50 text-red-700 border border-red-200" };
    case "VENDOR_PREPARING":
      return { label: "Vendor Preparing", className: "bg-amber-50 text-amber-700 border border-amber-200" };
    case "AWAITING_COURIER_PICKUP":
      return { label: "Awaiting Courier", className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "COURIER_ASSIGNED":
      return { label: "Courier Assigned", className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "COURIER_PICKED_UP":
      return { label: "Courier En Route", className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "VENDOR_DROPPED_OFF":
      return { label: "Dropped Off", className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "AT_WAREHOUSE":
      return { label: "At Warehouse", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    case "BUNDLED_FOR_DISPATCH":
      return { label: "Ready to Ship", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    case "DISPATCHED":
      return { label: "Out for Delivery", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    case "DELIVERED":
      return { label: "Delivered", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    default:
      return { label: status, className: "bg-zinc-100 text-zinc-600 border border-zinc-200" };
  }
}

export default async function OrderDetailPage({ params }: Props) {
  const { orderId } = await params;
  if (!orderId?.trim()) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const order = await prisma.mainOrder.findUnique({
    where: { id: orderId },
    include: {
      buyer: { select: { fullName: true, email: true } },
      items: {
        include: {
          product: {
            select: {
              name: true,
              slug: true,
              images: true,
              store: { select: { name: true, slug: true } },
            },
          },
        },
      },
      splitOrders: {
        select: {
          id: true,
          status: true,
          subtotalMinor: true,
          vendorInboundMethod: true,
          store: {
            select: { name: true, slug: true },
          },
          items: {
            select: {
              id: true,
              titleSnapshot: true,
              quantity: true,
              unitPriceMinor: true,
              lineTotalMinor: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const isBuyer = order.buyerId === session.userId;
  const isAdmin = session.role === "ADMIN";
  if (!isBuyer && !isAdmin) {
    notFound();
  }

  const qrCodeDataUrl = await generateOrderQRCodeDataURL(order.id);
  const orderUrl = getOrderUrl(order.id);

  const invoiceRef = `LW-${order.id.slice(-8).toUpperCase()}`;
  const currentStep = getProgressStep(order.status);
  const statusInfo = getStatusInfo(order.status);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <PublicNav />
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-2xl font-bold text-zinc-900">Order #{invoiceRef}</p>
            <p className="mt-1 text-sm text-zinc-500">{formatOrderDate(order.createdAt)}</p>
            <span
              className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses(order.status)}`}
            >
              {statusInfo.label}
            </span>
          </div>
          <a
            href={`/api/invoice/${order.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Invoice
          </a>
        </div>

        {/* Progress */}
        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Order Progress</h2>

          {order.status === "CANCELLED" ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              Order Cancelled
            </div>
          ) : order.status === "REFUNDED" ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              Order Refunded
            </div>
          ) : (
            <div className="mt-6">
              <div className="flex items-center overflow-x-auto pb-2">
                {ORDER_PROGRESS_STEPS.map((label, idx) => {
                  const lastIdx = ORDER_PROGRESS_STEPS.length - 1;
                  const delivered =
                    order.status === "COMPLETED" || order.status === "DELIVERED";
                  const completed = idx < currentStep || (delivered && idx === lastIdx);
                  const current = !completed && idx === currentStep;

                  return (
                    <Fragment key={label}>
                      <div className="flex min-w-[4.5rem] flex-col items-center">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            completed
                              ? "bg-[#D4450A] text-white"
                              : current
                                ? "border-2 border-[#D4450A] bg-white text-[#D4450A]"
                                : "border border-zinc-200 bg-zinc-100 text-zinc-400"
                          }`}
                        >
                          {completed ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <span className="mt-2 max-w-[5.5rem] text-center text-[10px] leading-tight text-zinc-500">
                          {label}
                        </span>
                      </div>
                      {idx < lastIdx ? (
                        <div
                          className={`mx-1 h-0.5 min-w-[12px] flex-1 ${
                            idx < currentStep ? "bg-[#D4450A]" : "bg-zinc-200"
                          }`}
                          aria-hidden
                        />
                      ) : null}
                    </Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {order.splitOrders && order.splitOrders.length > 1 ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-2.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-zinc-400"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <p className="text-xs text-zinc-600">
                This order contains items from{" "}
                <span className="font-semibold">{order.splitOrders.length} vendors</span> —{" "}
                {
                  order.splitOrders.filter((s) =>
                    ["AT_WAREHOUSE", "BUNDLED_FOR_DISPATCH", "DISPATCHED", "DELIVERED"].includes(s.status),
                  ).length
                }{" "}
                of {order.splitOrders.length} at warehouse
              </p>
            </div>
          ) : null}

          <p className="mt-4 text-sm text-zinc-500">{statusInfo.description}</p>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Items */}
          <div className="lg:col-span-2">
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-zinc-900">Items</h2>

              {order.splitOrders && order.splitOrders.length > 0 ? (
                <div className="flex flex-col gap-6">
                  {order.splitOrders.map((splitOrder) => {
                    const badge = getSplitOrderStatusLabel(splitOrder.status as string);
                    return (
                      <div key={splitOrder.id} className="overflow-hidden rounded-xl border border-zinc-100">
                        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-zinc-400"
                            >
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            <p className="text-sm font-semibold text-zinc-900">{splitOrder.store.name}</p>
                          </div>
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>

                        <ul className="divide-y divide-zinc-100 px-4">
                          {splitOrder.items.map((item) => {
                            const orderItem = order.items.find((oi) => oi.titleSnapshot === item.titleSnapshot);
                            const img = orderItem?.product?.images?.[0];
                            return (
                              <li key={item.id} className="flex gap-4 py-4">
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                                  {img ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={img} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                                      No image
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-zinc-900">{item.titleSnapshot}</p>
                                  <p className="mt-0.5 text-xs text-zinc-400">{splitOrder.store.name}</p>
                                  <p className="mt-1 text-xs text-zinc-600">
                                    {item.quantity} × TTD {(item.unitPriceMinor / 100).toFixed(2)}
                                  </p>
                                </div>
                                <p className="shrink-0 text-sm font-semibold text-zinc-900">
                                  TTD {(item.lineTotalMinor / 100).toFixed(2)}
                                </p>
                              </li>
                            );
                          })}
                        </ul>

                        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-4 py-2.5">
                          <p className="text-xs text-zinc-500">
                            {splitOrder.vendorInboundMethod === "VENDOR_DROPOFF"
                              ? "Vendor dropping off at warehouse"
                              : splitOrder.vendorInboundMethod === "PICKUP_REQUESTED"
                                ? "Courier pickup requested"
                                : "Fulfillment method not yet chosen"}
                          </p>
                          <p className="text-xs font-semibold text-zinc-900">
                            TTD {(splitOrder.subtotalMinor / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <ul className="mt-4 space-y-4">
                  {order.items.map((item) => {
                    const img = item.product?.images?.[0];
                    const lineTotal = (item.priceMinor / 100) * item.quantity;
                    return (
                      <li key={item.id} className="flex gap-4 border-b border-zinc-100 pb-4 last:border-0">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-zinc-900">{item.titleSnapshot}</p>
                          <p className="text-xs text-zinc-400">{item.product?.store?.name ?? "Store"}</p>
                          <p className="mt-1 text-sm text-zinc-600">
                            {item.quantity} × TTD {(item.priceMinor / 100).toFixed(2)}
                          </p>
                          <p className="text-sm font-medium text-zinc-900">TTD {lineTotal.toFixed(2)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6 lg:col-span-1">
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Order summary</h2>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal</span>
                  <span>TTD {(order.subtotalMinor / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Shipping</span>
                  <span>TTD {(order.shippingMinor / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-100 pt-2 text-base font-bold text-[#D4450A]">
                  <span>Total</span>
                  <span>TTD {(order.totalMinor / 100).toFixed(2)}</span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Delivery info</h2>
              <p className="mt-3 text-sm font-medium text-zinc-900">{order.buyer.fullName}</p>
              <p className="mt-1 text-sm text-zinc-600">{order.buyer.email}</p>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Track order</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeDataUrl}
                alt="Order QR code"
                width={120}
                height={120}
                className="mt-3 h-[120px] w-[120px]"
              />
              <p className="mt-3 text-sm font-medium text-zinc-800">Scan to track this order</p>
              <p className="mt-2 break-all text-xs text-zinc-500">{orderUrl}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
