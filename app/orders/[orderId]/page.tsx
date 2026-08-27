import { Fragment } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import MarkReceivedButton from "@/app/orders/components/mark-received-button";
import SplitProgressMini from "@/components/orders/split-progress-mini";
import PublicNav from "@/components/layout/PublicNav";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getSplitOrderStatusLabel, getStatusInfo } from "@/lib/orders/order-status";
import { getSplitProgressSteps, getSplitStepIndex } from "@/lib/orders/split-progress";
import {
  computeSplitWeightLbs,
  formatWeightLbs,
} from "@/lib/orders/split-weight";
import { generateOrderQRCodeDataURL, getOrderUrl } from "@/lib/orders/qr-code";
import { prisma } from "@/lib/prisma";

const DIGITAL_PROGRESS_STEPS = [
  "Order Placed",
  "Payment Confirmed",
  "Ready to Download",
];

type Props = { params: Promise<{ orderId: string }> };

function getOrderStatusBadge(status: string) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    PAID: { label: "Order Placed", bg: "#DBEAFE", color: "#1D4ED8" },
    PROCESSING: { label: "Processing", bg: "#FEF3C7", color: "#92400E" },
    SHIPPED: { label: "Out for Delivery", bg: "#EFF8FC", color: "#1A7FB5" },
    DELIVERED: { label: "Delivered", bg: "#DCFCE7", color: "#15803D" },
    COMPLETED: { label: "Completed", bg: "#DCFCE7", color: "#15803D" },
    CUSTOMER_RECEIVED: { label: "Received", bg: "#BBF7D0", color: "#065F46" },
    CANCELLED: { label: "Cancelled", bg: "#FEE2E2", color: "#991B1B" },
  };
  const s = map[status] ?? { label: status.replace(/_/g, " "), bg: "#F4F4F5", color: "#52525B" };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function formatOrderDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-TT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function forceDownloadUrl(url: string, filename?: string): string {
  if (!url) return url;

  // For Cloudinary URLs, insert fl_attachment transformation
  if (url.includes("res.cloudinary.com")) {
    // Insert fl_attachment into the transformation chain
    // URL format: https://res.cloudinary.com/cloud/image/upload/v123/folder/file.ext
    // or: https://res.cloudinary.com/cloud/raw/upload/v123/folder/file.ext
    const attachmentParam = filename
      ? `fl_attachment:${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`
      : "fl_attachment";
    return url.replace("/upload/", `/upload/${attachmentParam}/`);
  }

  // For other URLs, return as-is (browser will handle)
  return url;
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
    select: {
      id: true,
      buyerId: true,
      referenceNumber: true,
      status: true,
      createdAt: true,
      region: true,
      subtotalMinor: true,
      shippingMinor: true,
      totalMinor: true,
      shippingAddressId: true,
      buyer: { select: { fullName: true, email: true } },
      shippingAddress: {
        select: {
          line1: true,
          line2: true,
          city: true,
          region: true,
          postalCode: true,
          country: true,
          phone: true,
        },
      },
      items: {
        select: {
          id: true,
          listingId: true,
          titleSnapshot: true,
          quantity: true,
          priceMinor: true,
          weightLbs: true,
          product: {
            select: {
              name: true,
              slug: true,
              images: true,
              isDigital: true,
              digitalFileUrl: true,
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
          deliveredAt: true,
          earningsReleased: true,
          store: {
            select: { name: true, slug: true, shippingMode: true },
          },
          items: {
            select: {
              id: true,
              listingId: true,
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

  const digitalItems = order.items.filter((item) => item.product?.isDigital);
  const allDigital = digitalItems.length === order.items.length;
  const hasDigital = digitalItems.length > 0;
  const digitalListingIds = new Set(
    digitalItems.flatMap((item) => (item.listingId ? [item.listingId] : [])),
  );
  const digitalTitles = new Set(digitalItems.map((item) => item.titleSnapshot));
  const isDigitalSplitItem = (item: { listingId: string; titleSnapshot: string }) =>
    digitalListingIds.has(item.listingId) || digitalTitles.has(item.titleSnapshot);
  const paid =
    order.status === "PAID" ||
    order.status === "COMPLETED" ||
    order.status === "PROCESSING";

  const dashboardHref = session ? getRoleDashboardPath(session.role) : null;

  const tracking = allDigital
    ? null
    : {
        qrCodeDataUrl: await generateOrderQRCodeDataURL(order.id),
        orderUrl: getOrderUrl(order.id),
      };

  const statusInfo = getStatusInfo(order.status);

  const physicalSplitOrders = order.splitOrders.filter((splitOrder) =>
    splitOrder.items.some((item) => !isDigitalSplitItem(item)),
  );
  const splitTotal = physicalSplitOrders.length;
  const deliveredCount = physicalSplitOrders.filter((s) =>
    ["DELIVERED", "COMPLETED"].includes(s.status),
  ).length;
  const isMultiStore = splitTotal > 1;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F5F5F5]">
      <PublicNav
        user={session ? { name: session.fullName ?? "Account", href: dashboardHref! } : null}
        dashboardHref={dashboardHref ?? undefined}
      />
      <div className="mx-auto w-full min-w-0 max-w-4xl px-3 py-5 sm:px-6 sm:py-8">
        <Link
          href="/orders"
          className="mb-4 inline-flex items-center gap-1 text-xs hover:underline"
          style={{ color: "var(--blue)" }}
        >
          ← Back to orders
        </Link>

        <div className="mb-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              Order #{order.referenceNumber ?? order.id.slice(-8).toUpperCase()}
            </h1>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              Placed {formatOrderDate(order.createdAt)}
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end sm:gap-3">
            {getOrderStatusBadge(order.status)}
            <a
              href={`/api/invoice/${order.id}`}
              className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 sm:shrink-0 sm:px-4"
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
        </div>

        {/* Progress */}
        <section
          className="mb-5 min-w-0 overflow-hidden rounded-xl bg-white p-4 sm:p-6"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Order Progress
          </h2>

          {order.status === "CANCELLED" ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              Order Cancelled
            </div>
          ) : order.status === "REFUNDED" ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              Order Refunded
            </div>
          ) : allDigital ? (
            <div className="mt-6">
              <div className="flex items-center overflow-x-auto pb-2">
                {DIGITAL_PROGRESS_STEPS.map((label, idx) => {
                  const lastIdx = DIGITAL_PROGRESS_STEPS.length - 1;
                  const completed =
                    idx === 0 || (idx === 1 && paid) || (idx === 2 && paid);
                  const current = !completed && idx === (paid ? 2 : 1);
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
                        <span className="mt-2 hidden max-w-[5.5rem] text-center text-[10px] leading-tight text-zinc-500 sm:block">
                          {label}
                        </span>
                      </div>
                      {idx < lastIdx ? (
                        <div
                          className={`mx-1 h-0.5 min-w-[12px] flex-1 ${
                            idx < (paid ? 3 : 1) ? "bg-[#D4450A]" : "bg-zinc-200"
                          }`}
                          aria-hidden
                        />
                      ) : null}
                    </Fragment>
                  );
                })}
              </div>

              {paid ? (
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="mb-3 text-sm font-bold text-emerald-900">Your downloads are ready</p>
                  <div className="flex flex-col gap-2">
                    {order.items.map((item) =>
                      item.product && item.product.digitalFileUrl ? (
                        <a
                          key={item.id}
                          href={forceDownloadUrl(
                            item.product.digitalFileUrl,
                            item.product.name,
                          )}
                          download
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          Download {item.product.name}
                        </a>
                      ) : null,
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                  <p className="text-sm text-zinc-600">
                    Your download link will appear here once payment is confirmed.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2">
              {isMultiStore ? (
                <p className="text-sm text-zinc-600">
                  <span className="font-semibold">
                    {deliveredCount} of {splitTotal} stores received
                  </span>
                </p>
              ) : physicalSplitOrders.length === 1 ? (
                <p className="text-sm text-zinc-600">
                  {getSplitOrderStatusLabel(physicalSplitOrders[0].status).label}
                </p>
              ) : null}
            </div>
          )}

          {!allDigital && physicalSplitOrders.length > 1 ? (
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
                This order has items from{" "}
                <span className="font-semibold">{physicalSplitOrders.length} stores</span>. Each store
                {order.shippingAddressId == null
                  ? " prepares its items for pickup separately."
                  : " ships its items separately."}
              </p>
            </div>
          ) : null}

          {!allDigital && order.status !== "CANCELLED" && order.status !== "REFUNDED" ? (
            <p className="mt-4 text-sm text-zinc-500">{statusInfo.description}</p>
          ) : null}
        </section>

        {hasDigital && !allDigital ? (
          <section
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6"
          >
            <h2 className="text-sm font-bold text-emerald-900">Digital items</h2>
            {paid ? (
              <div className="mt-3 flex flex-col gap-2">
                {digitalItems.map((item) =>
                  item.product?.digitalFileUrl ? (
                    <a
                      key={item.id}
                      href={forceDownloadUrl(item.product.digitalFileUrl, item.product.name)}
                      download
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Download {item.product.name}
                    </a>
                  ) : null,
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-emerald-800">
                Your download links will appear here once payment is confirmed.
              </p>
            )}
          </section>
        ) : null}

        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Items */}
          <div className="mb-5 min-w-0 lg:col-span-2 lg:mb-0">
            <section
              className="min-w-0 overflow-hidden rounded-xl bg-white p-4 sm:p-6"
              style={{ border: "1px solid var(--card-border)" }}
            >
              <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Items
              </h2>

              {order.splitOrders && order.splitOrders.length > 0 ? (
                <div className="flex flex-col gap-6">
                  {order.splitOrders.map((splitOrder) => {
                    const splitHasPhysicalItems = splitOrder.items.some(
                      (item) => !isDigitalSplitItem(item),
                    );
                    const badge = splitHasPhysicalItems
                      ? getSplitOrderStatusLabel(splitOrder.status as string)
                      : {
                          label: paid ? "Ready to download" : "Payment pending",
                          className: paid
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-zinc-200 bg-zinc-50 text-zinc-600",
                        };
                    const isReceivable =
                      splitHasPhysicalItems &&
                      isBuyer &&
                      (splitOrder.status === "SHIPPED" || splitOrder.status === "OUT_FOR_DELIVERY");
                    const isReceived =
                      splitHasPhysicalItems &&
                      (splitOrder.status === "DELIVERED" || splitOrder.status === "COMPLETED");
                    const splitWeight = computeSplitWeightLbs(
                      splitOrder.items,
                      order.items.map((oi) => ({
                        titleSnapshot: oi.titleSnapshot,
                        weightLbs: oi.product?.isDigital ? 0 : oi.weightLbs,
                        quantity: oi.quantity,
                      })),
                    );
                    const weightByTitle = new Map(
                      splitWeight.lines.map((line) => [line.titleSnapshot, line]),
                    );
                    return (
                      <div key={splitOrder.id} className="min-w-0 overflow-hidden rounded-xl border border-zinc-100">
                        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-3 sm:px-4">
                          <div className="flex min-w-0 items-center gap-2">
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
                            <p className="min-w-0 truncate text-sm font-semibold text-zinc-900">{splitOrder.store.name}</p>
                          </div>
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>

                        {splitHasPhysicalItems ? (
                          <div className="border-b border-zinc-100 bg-white">
                            <SplitProgressMini
                              steps={getSplitProgressSteps(
                                splitOrder.store.shippingMode,
                                "customer",
                                order.shippingAddressId == null ? "pickup" : "delivery",
                              )}
                              stepIndex={getSplitStepIndex(
                                splitOrder.status,
                                splitOrder.store.shippingMode,
                                order.shippingAddressId == null ? "pickup" : "delivery",
                              )}
                            />
                          </div>
                        ) : null}

                        <ul className="min-w-0 divide-y divide-zinc-100 px-3 sm:px-4">
                          {splitOrder.items.map((item) => {
                            const orderItem = order.items.find(
                              (oi) =>
                                (oi.listingId != null && oi.listingId === item.listingId) ||
                                oi.titleSnapshot === item.titleSnapshot,
                            );
                            const isDigitalItem = isDigitalSplitItem(item);
                            const img = orderItem?.product?.images?.[0];
                            const weightLine = weightByTitle.get(item.titleSnapshot);
                            return (
                              <li key={item.id} className="flex min-w-0 gap-3 py-4 sm:gap-4">
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
                                  <p className="break-words text-sm font-medium text-zinc-900">{item.titleSnapshot}</p>
                                  <p className="mt-0.5 text-xs text-zinc-400">{splitOrder.store.name}</p>
                                  <p className="mt-1 text-xs text-zinc-600">
                                    {item.quantity} × TTD {(item.unitPriceMinor / 100).toFixed(2)}
                                  </p>
                                  {isDigitalItem && paid && orderItem?.product?.digitalFileUrl ? (
                                    <a
                                      href={forceDownloadUrl(
                                        orderItem.product.digitalFileUrl,
                                        orderItem.product.name,
                                      )}
                                      download
                                      rel="noopener noreferrer"
                                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-900"
                                    >
                                      Download file
                                      <span aria-hidden>↓</span>
                                    </a>
                                  ) : isDigitalItem ? (
                                    <p className="mt-0.5 text-xs font-medium text-emerald-700">
                                      Available after payment
                                    </p>
                                  ) : weightLine && weightLine.unitWeightLbs != null && weightLine.unitWeightLbs > 0 ? (
                                    <p className="mt-0.5 text-xs text-zinc-400">
                                      {formatWeightLbs(weightLine.unitWeightLbs)} lb each
                                    </p>
                                  ) : null}
                                </div>
                                <p className="hidden shrink-0 text-sm font-semibold text-zinc-900 min-[430px]:block">
                                  TTD {(item.lineTotalMinor / 100).toFixed(2)}
                                </p>
                              </li>
                            );
                          })}
                        </ul>

                        <div className="flex min-w-0 items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50 px-3 py-2.5 sm:px-4">
                          <div className="min-w-0">
                            <p className="text-xs text-zinc-500">
                              {!splitHasPhysicalItems
                                ? "Digital delivery"
                                : order.shippingAddressId == null
                                  ? `Pickup from ${splitOrder.store.name}`
                                  : splitOrder.store.shippingMode === "SELF"
                                  ? `Delivered by ${splitOrder.store.name}`
                                  : "LinkWe delivery"}
                            </p>
                            {splitWeight.totalLbs > 0 ? (
                              <p className="mt-0.5 text-xs text-zinc-400">
                                Total weight: {formatWeightLbs(splitWeight.totalLbs)} lb
                              </p>
                            ) : null}
                          </div>
                          <p className="text-xs font-semibold text-zinc-900">
                            TTD {(splitOrder.subtotalMinor / 100).toFixed(2)}
                          </p>
                        </div>

                        {isReceivable ? (
                          <div className="border-t border-zinc-100 bg-emerald-50/50 px-4 py-3">
                            <MarkReceivedButton
                              splitOrderId={splitOrder.id}
                              storeName={splitOrder.store.name}
                            />
                          </div>
                        ) : isReceived ? (
                          <div className="flex items-center gap-2 border-t border-emerald-100 bg-emerald-50 px-4 py-3">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#059669"
                              strokeWidth="2.5"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <p className="text-xs font-semibold text-emerald-800">Received ✓</p>
                          </div>
                        ) : null}
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
          <div className="order-2 flex min-w-0 flex-col gap-5 md:col-span-1">
            <section
              className="rounded-xl bg-white p-5 sm:p-6"
              style={{ border: "1px solid var(--card-border)" }}
            >
              <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Order summary
              </h2>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal</span>
                  <span>TTD {(order.subtotalMinor / 100).toFixed(2)}</span>
                </div>
                {allDigital ? (
                  <div className="flex justify-between text-zinc-600">
                    <span>Delivery</span>
                    <span className="font-semibold text-emerald-600">
                      Free — instant download
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between text-zinc-600">
                    <span>Shipping</span>
                    <span>TTD {(order.shippingMinor / 100).toFixed(2)}</span>
                  </div>
                )}
                <div
                  className="flex justify-between border-t border-zinc-100 pt-2 text-base font-bold"
                  style={{ color: "var(--scarlet)" }}
                >
                  <span>Total</span>
                  <span>TTD {(order.totalMinor / 100).toFixed(2)}</span>
                </div>
              </div>
            </section>

            {allDigital ? (
              <section
                className="rounded-xl bg-white p-5 sm:p-6"
                style={{ border: "1px solid var(--card-border)" }}
              >
                <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Digital delivery
                </h2>
                <p className="text-sm text-zinc-600">
                  {paid
                    ? "Your files are ready in the download section above."
                    : "Your files will appear in the download section once payment is confirmed."}
                </p>
                <p className="mt-3 text-xs text-zinc-500">
                  Purchase confirmation sent to {order.buyer.email}
                </p>
              </section>
            ) : (
              <>
                <section
                  className="rounded-xl bg-white p-5 sm:p-6"
                  style={{ border: "1px solid var(--card-border)" }}
                >
                  <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Delivery info
                  </h2>
                  <p className="text-sm font-medium text-zinc-900">{order.buyer.fullName}</p>
                  <p className="mt-1 text-sm text-zinc-600">{order.buyer.email}</p>
                  {order.shippingAddress ? (
                    <div className="mt-4 border-t border-zinc-100 pt-4 text-sm text-zinc-600">
                      <p className="font-medium text-zinc-900">{order.shippingAddress.line1}</p>
                      {order.shippingAddress.line2 ? <p>{order.shippingAddress.line2}</p> : null}
                      <p>
                        {Array.from(
                          new Set(
                            [order.shippingAddress.city, order.shippingAddress.region]
                              .filter((value): value is string => Boolean(value?.trim()))
                              .map((value) => value.trim()),
                          ),
                        ).join(", ")}
                        {order.shippingAddress.postalCode
                          ? ` ${order.shippingAddress.postalCode}`
                          : ""}
                      </p>
                      {order.shippingAddress.country === "TT" ? (
                        <p>Trinidad &amp; Tobago</p>
                      ) : null}
                      {order.shippingAddress.phone ? (
                        <a
                          href={`tel:${order.shippingAddress.phone.replace(/\s+/g, "")}`}
                          className="mt-3 inline-flex font-medium text-zinc-800 hover:underline"
                        >
                          Tel: {order.shippingAddress.phone}
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-zinc-500">
                      Delivery region: {order.region.replace(/_/g, " ")}
                    </p>
                  )}
                </section>

                {tracking ? (
                  <section
                    className="rounded-xl bg-white p-5 sm:p-6"
                    style={{ border: "1px solid var(--card-border)" }}
                  >
                    <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Track order
                    </h2>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tracking.qrCodeDataUrl}
                      alt="Order QR code"
                      width={120}
                      height={120}
                      className="mt-3 h-[120px] w-[120px]"
                    />
                    <p className="mt-3 text-sm font-medium text-zinc-800">Scan to track this order</p>
                    <p className="mt-2 break-all text-xs text-zinc-500">{tracking.orderUrl}</p>
                  </section>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      <footer
        className="mt-12 py-6 text-center"
        style={{ borderTop: "1px solid var(--card-border-subtle)" }}
      >
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          <Link href="/" style={{ color: "var(--scarlet)" }}>
            LinkWe
          </Link>{" "}
          — Trinidad & Tobago&apos;s Marketplace
        </p>
      </footer>
    </div>
  );
}
