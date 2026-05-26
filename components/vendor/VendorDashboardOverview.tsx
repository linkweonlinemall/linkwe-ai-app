"use client";

import Image from "next/image";
import Link from "next/link";
import type { SplitOrderStatus } from "@prisma/client";
import {
  IconChartBar,
  IconCircleCheck,
  IconCoin,
  IconEdit,
  IconEye,
  IconInfoCircle,
  IconPercentage,
  IconPlus,
  IconReceipt,
  IconShoppingBag,
  IconStarFilled,
  IconTrendingUp,
} from "@tabler/icons-react";

import type { VendorSplitOrder } from "@/app/(dashboard)/dashboard/vendor/components/tabs/orders-tab";
import type { VendorDashboardAnalytics } from "@/lib/vendor/vendor-dashboard-analytics";
import { getStoreCategoryLabel } from "@/lib/categories";

function formatPctChange(pct: number): string {
  const rounded = Math.abs(pct) >= 100 ? pct.toFixed(0) : pct.toFixed(1);
  return `${pct > 0 ? "+" : ""}${rounded}%`;
}

type ReviewSummary = {
  total: number;
  average: number;
  breakdown: Record<number, number>;
};

type ProfileRowSource = {
  label: string;
  done: boolean;
  detail?: string;
};

/** Spec checklist subset + gallery row label normalization */
function profileRowsForCard(items: ProfileRowSource[]) {
  const keys: { label: string; match: (i: ProfileRowSource) => boolean }[] = [
    { label: "Store logo", match: (i) => /^store logo$/i.test(i.label) },
    { label: "Description", match: (i) => /^description$/i.test(i.label) },
    { label: "Opening hours", match: (i) => /opening hours/i.test(i.label) },
    { label: "Cover photo", match: (i) => /^cover photo$/i.test(i.label) },
    { label: "Gallery photos", match: (i) => /^gallery/i.test(i.label) },
    { label: "Store location", match: (i) => /^store location$/i.test(i.label) },
  ];
  const rows = keys.map((k) => {
    const hit = items.find((i) => k.match(i));
    return { label: k.label, done: !!hit?.done };
  });
  const done = rows.filter((r) => r.done).length;
  const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;
  return { rows, pct };
}

function pillForSplitStatus(status: string): { label: string; className: string } {
  switch (status as SplitOrderStatus) {
    case "DELIVERED":
    case "DISPATCHED":
    case "BUNDLED_FOR_DISPATCH":
    case "PACKAGED":
      return { label: "Confirmed", className: "bg-[#EAF3DE] text-[#3B6D11]" };
    case "AWAITING_VENDOR_ACTION":
      return { label: "New", className: "bg-[#E6F1FB] text-[#185FA5]" };
    default:
      return { label: "Pending", className: "bg-[#FAEEDA] text-[#854F0B]" };
  }
}

function DeltaLine({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#15803d]">
        <IconTrendingUp className="size-3 shrink-0" stroke={2} aria-hidden />
        vs last month new activity
      </p>
    );
  }
  if (Math.abs(pct) < 0.05) {
    return <p className="mt-1 text-[11px] font-medium text-[#a09f9b]">— vs last month {formatPctChange(0)}</p>;
  }
  const up = pct > 0;
  return (
    <p className={`mt-1 flex items-center gap-1 text-[11px] font-medium ${up ? "text-[#15803d]" : "text-[#b91c1c]"}`}>
      <IconTrendingUp className={`size-3 shrink-0 ${up ? "" : "rotate-180"}`} stroke={2} aria-hidden />
      vs last month {formatPctChange(pct)}
    </p>
  );
}

const CARD_BORDER = "border-[0.5px] border-[rgba(28,28,26,0.12)]";

export default function VendorDashboardOverview(props: {
  analytics: VendorDashboardAnalytics;
  recentOrders: VendorSplitOrder[];
  reviewSummary: ReviewSummary;
  completenessItems: ProfileRowSource[];
  store: {
    name: string;
    slug: string;
    categoryId: string;
    region: string;
    logoUrl: string | null;
    coverPhotoUrl: string | null;
  };
}) {
  const { analytics, recentOrders, reviewSummary, completenessItems, store } = props;

  const { rows: profileRows, pct: profilePct } = profileRowsForCard(completenessItems);
  const overallPct = completenessItems.length
    ? Math.round((completenessItems.filter((i) => i.done).length / completenessItems.length) * 100)
    : 0;

  const amounts = analytics.salesLast30Days.map((d) => d.amountTtd);
  const maxAmt = amounts.length ? Math.max(...amounts, 1) : 1;
  const maxBarH = 140;

  const salesFmt = analytics.salesThisMonthTtd.toLocaleString("en-TT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const convFmt = analytics.conversionRatePct.toLocaleString("en-TT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const categoryLabel = getStoreCategoryLabel(store.categoryId);

  const avgStars = Math.round(Math.min(5, Math.max(0, reviewSummary.average || 0)));
  const maxReviewCount = Math.max(...[1, 2, 3, 4, 5].map((s) => reviewSummary.breakdown[s] ?? 0), 1);

  return (
    <div className="space-y-5 font-sans max-md:[&_.dash-card-pad]:p-3">
      {overallPct < 100 ? (
        <div className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#B5D4F4] bg-[#EBF5FB] px-4 py-3 max-md:flex-col max-md:items-start`}>
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#1A7FB5] shadow-sm">
              <IconInfoCircle className="size-5" stroke={1.5} aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0C447C]">Complete your storefront profile</p>
              <p className="mt-0.5 text-[12px] text-[#378ADD]">You&apos;re at {overallPct}% — finish the checklist to unlock more visibility.</p>
            </div>
          </div>
          <Link
            href="/dashboard/vendor?tab=store"
            className="max-md:w-full shrink-0 rounded-lg border border-[#378ADD] bg-white px-4 py-2 text-center text-sm font-semibold text-[#0C447C] hover:bg-[#f8fbff]"
          >
            Complete profile
          </Link>
        </div>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-3">
        <div className={`rounded-[12px] bg-white dash-card-pad p-4 ${CARD_BORDER}`}>
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] text-[#7c7b77]">Total sales</span>
            <span className="flex size-[26px] items-center justify-center rounded-lg bg-[#FEF0EB] text-[#D4450A]">
              <IconCoin className="size-4" stroke={1.75} aria-hidden />
            </span>
          </div>
          <p className="mt-3 text-[22px] font-medium tabular-nums text-[#1C1C1A]">{`TTD ${salesFmt}`}</p>
          <DeltaLine pct={analytics.salesChangePct} />
        </div>
        <div className={`rounded-[12px] bg-white dash-card-pad p-4 ${CARD_BORDER}`}>
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] text-[#7c7b77]">Orders this month</span>
            <span className="flex size-[26px] items-center justify-center rounded-lg bg-[#E6F1FB] text-[#1A7FB5]">
              <IconShoppingBag className="size-4" stroke={1.75} aria-hidden />
            </span>
          </div>
          <p className="mt-3 text-[22px] font-medium tabular-nums text-[#1C1C1A]">{analytics.ordersThisMonth}</p>
          <DeltaLine pct={analytics.ordersChangePct} />
        </div>
        <div className={`rounded-[12px] bg-white dash-card-pad p-4 ${CARD_BORDER}`}>
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] text-[#7c7b77]">Profile views</span>
            <span className="flex size-[26px] items-center justify-center rounded-lg bg-[#FAEEDA] text-[#BA7517]">
              <IconEye className="size-4" stroke={1.75} aria-hidden />
            </span>
          </div>
          <p className="mt-3 text-[22px] font-medium tabular-nums text-[#1C1C1A]">
            {analytics.profileViewsTotal.toLocaleString("en-TT")}
          </p>
          <DeltaLine pct={analytics.profileViewsChangePct} />
        </div>
        <div className={`rounded-[12px] bg-white dash-card-pad p-4 ${CARD_BORDER}`}>
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] text-[#7c7b77]">Conversion rate</span>
            <span className="flex size-[26px] items-center justify-center rounded-lg bg-[#EAF3DE] text-[#3B6D11]">
              <IconPercentage className="size-4" stroke={1.75} aria-hidden />
            </span>
          </div>
          <p className="mt-3 text-[22px] font-medium tabular-nums text-[#1C1C1A]">{`${convFmt}%`}</p>
          <DeltaLine pct={analytics.conversionChangePct} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_240px] xl:grid-cols-[1fr_280px]">
        {/* Left column */}
        <div className="space-y-4">
          {/* Sales bars */}
          <div className={`rounded-[12px] bg-white p-4 ${CARD_BORDER} dash-card-pad`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-[#1C1C1A]">
                <IconChartBar className="size-[18px] text-[#7c7b77]" stroke={1.5} aria-hidden />
                Sales — last 30 days
              </div>
              <Link href="/dashboard/vendor/finance" className="text-[12px] font-semibold text-[#1A7FB5] hover:underline">
                View report
              </Link>
            </div>
            <div className="flex h-[140px] items-end justify-between gap-1 pb-8">
              {analytics.salesLast30Days.map((d, idx) => {
                const pct = Math.max(10, Math.round((d.amountTtd / maxAmt) * 100));
                const hPx = Math.round((maxBarH * pct) / 100);
                const isWeekend =
                  idx % 7 === 0 || idx === analytics.salesLast30Days.length - 1;
                return (
                  <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    <div
                      className={`w-full max-w-[10px] rounded-t-sm ${d.amountTtd > 0 ? "bg-[#D4450A]" : "bg-[#FEF0EB]"}`}
                      style={{ height: `${Math.max(4, hPx)}px` }}
                    />
                    <span className="absolute bottom-0 hidden text-[9px] text-[#a09f9b]">
                      {/* labels below grid */}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="-mt-6 flex justify-between gap-0.5">
              {analytics.salesLast30Days.map((d) => {
                const day = new Date(d.date + "T12:00:00.000Z").toLocaleDateString("en-TT", { weekday: "narrow" });
                return (
                  <div key={`l-${d.date}`} className="min-w-0 flex-1 text-center text-[9px] text-[#a09f9b]">
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent orders */}
          <div className={`rounded-[12px] bg-white ${CARD_BORDER} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-[rgba(28,28,26,0.08)] px-4 py-3 dash-card-pad">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-[#1C1C1A]">
                <IconShoppingBag className="size-[18px] text-[#7c7b77]" stroke={1.5} aria-hidden />
                Recent orders
              </div>
              <Link href="/dashboard/vendor/orders" className="text-[12px] font-semibold text-[#1A7FB5] hover:underline">
                View all
              </Link>
            </div>
            <div>
              {recentOrders.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[#7c7b77]">No orders yet</p>
              ) : (
                recentOrders.map((o) => {
                  const first = o.items[0];
                  const title = first?.titleSnapshot ?? "Order";
                  const pill = pillForSplitStatus(o.status);
                  return (
                    <div
                      key={o.id}
                      className="flex items-start gap-3 border-b border-[rgba(28,28,26,0.06)] px-4 py-[11px] last:border-b-0"
                    >
                      <div className="size-9 shrink-0 rounded-[8px] bg-[#F7F5F2]" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-[#1C1C1A]">{title}</p>
                        <p className="mt-0.5 text-[10px] text-[#7c7b77]">
                          {o.mainOrder.buyer.fullName ?? "Customer"} · {new Date(o.createdAt).toLocaleDateString("en-TT")}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[12px] font-medium tabular-nums text-[#1C1C1A]">
                          TTD {(o.subtotalMinor / 100).toFixed(2)}
                        </p>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${pill.className}`}>
                          {pill.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Store profile */}
          <div className={`overflow-hidden rounded-[12px] bg-white ${CARD_BORDER}`}>
            <div
              className="relative h-[60px] bg-[#1C1C1A]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 4px, transparent 4px, transparent 8px)",
              }}
            >
              {store.coverPhotoUrl ? (
                <Image src={store.coverPhotoUrl} alt="" fill className="object-cover opacity-60" sizes="320px" />
              ) : null}
            </div>
            <div className="relative px-3.5 pb-3.5 pt-0" style={{ paddingTop: "28px" }}>
              <div className="absolute -top-[22px] left-3.5 flex size-11 items-center justify-center rounded-full bg-[#D4450A] text-sm font-bold text-white ring-4 ring-white">
                {store.name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "LW"}
              </div>
              <p className="text-[13px] font-medium text-[#1C1C1A]">{store.name}</p>
              <p className="mt-1 text-[10px] text-[#7c7b77]">
                {categoryLabel} · {store.region.replace(/_/g, " ")}
              </p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[11px] font-medium">
                  <span className="text-[#7c7b77]">Profile strength</span>
                  <span className="text-[#D4450A]">{profilePct}%</span>
                </div>
                <div className="h-[4px] overflow-hidden rounded-full bg-[#F7F5F2]">
                  <div className="h-full rounded-full bg-[#D4450A]" style={{ width: `${profilePct}%` }} />
                </div>
              </div>
              <ul className="mt-4 space-y-2 border-t border-[rgba(28,28,26,0.06)] pt-3">
                {profileRows.map((row) => (
                  <li key={row.label} className="flex items-center gap-2 text-[11px] text-[#45443f]">
                    {row.done ? (
                      <IconCircleCheck className="size-4 shrink-0 text-emerald-500" stroke={1.75} aria-hidden />
                    ) : (
                      <span className="size-4 shrink-0 rounded-full border border-[#d4d3cf] bg-white" aria-hidden />
                    )}
                    {row.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick actions */}
          <div className={`rounded-[12px] bg-white p-3.5 ${CARD_BORDER} dash-card-pad`}>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/dashboard/vendor/products/new"
                className="flex flex-col items-center gap-1.5 rounded-lg bg-[#F7F5F2] px-2 py-3 text-center hover:bg-[#FEF0EB]"
              >
                <IconPlus className="size-[18px] text-[#D4450A]" stroke={1.75} aria-hidden />
                <span className="text-[10px] font-medium leading-tight text-[#45443f]">New product</span>
              </Link>
              <Link
                href="/dashboard/vendor?tab=store"
                className="flex flex-col items-center gap-1.5 rounded-lg bg-[#F7F5F2] px-2 py-3 text-center hover:bg-[#FEF0EB]"
              >
                <IconEdit className="size-[18px] text-[#D4450A]" stroke={1.75} aria-hidden />
                <span className="text-[10px] font-medium leading-tight text-[#45443f]">Edit store</span>
              </Link>
              <Link
                href="/dashboard/vendor/orders"
                className="flex flex-col items-center gap-1.5 rounded-lg bg-[#F7F5F2] px-2 py-3 text-center hover:bg-[#FEF0EB]"
              >
                <IconReceipt className="size-[18px] text-[#D4450A]" stroke={1.75} aria-hidden />
                <span className="text-[10px] font-medium leading-tight text-[#45443f]">View orders</span>
              </Link>
              <Link
                href="/dashboard/vendor/finance"
                className="flex flex-col items-center gap-1.5 rounded-lg bg-[#F7F5F2] px-2 py-3 text-center hover:bg-[#FEF0EB]"
              >
                <IconCoin className="size-[18px] text-[#D4450A]" stroke={1.75} aria-hidden />
                <span className="text-[10px] font-medium leading-tight text-[#45443f]">Finance</span>
              </Link>
            </div>
          </div>

          {/* Reviews */}
          <div className={`rounded-[12px] bg-white p-3.5 ${CARD_BORDER} dash-card-pad`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold text-[#1C1C1A]">Reviews</span>
              <Link href={`/dashboard/vendor/reviews`} className="text-[12px] font-semibold text-[#1A7FB5] hover:underline">
                View all
              </Link>
            </div>
            <div className="flex flex-wrap items-start gap-3">
              <p className="text-[28px] font-semibold tabular-nums leading-none text-[#1C1C1A]">
                {reviewSummary.total > 0 ? reviewSummary.average.toFixed(1) : "—"}
              </p>
              <div className="flex flex-col gap-0.5 pt-1">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <IconStarFilled
                      key={i}
                      className={`size-[18px] ${i <= avgStars ? "text-[#E8820C]" : "text-[#ecebe8]"}`}
                      aria-hidden
                    />
                  ))}
                </div>
                <p className="text-[10px] text-[#7c7b77]">{reviewSummary.total} reviews</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const c = reviewSummary.breakdown[star] ?? 0;
                const w = `${Math.round((c / maxReviewCount) * 100)}%`;
                return (
                  <div key={star} className="flex items-center gap-2 text-[10px] text-[#7c7b77]">
                    <span className="w-8 tabular-nums">{star}★</span>
                    <div className="h-[4px] min-w-0 flex-1 rounded-full bg-[#F7F5F2]">
                      <div className="h-full rounded-full bg-[#E8820C]" style={{ width: w }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
