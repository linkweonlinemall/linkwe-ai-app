"use client";

import Link from "next/link";
import NotificationBell from "@/components/ui/NotificationBell";

function formatVendorDate(now: Date) {
  return now.toLocaleDateString("en-TT", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function greetingLine(firstName: string, now: Date) {
  const h = now.getHours();
  const label = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${label}, ${firstName}`;
}

/** Mobile spec: "Morning, John" (no leading "Good"). */
function shortGreeting(firstName: string, now: Date) {
  const h = now.getHours();
  const word = h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
  return `${word}, ${firstName}`;
}

export type VendorDashboardTopbarProps = {
  firstName: string;
  unreadCount: number;
};

export default function VendorDashboardTopbar({ firstName, unreadCount }: VendorDashboardTopbarProps) {
  const now = new Date();

  return (
    <header
      className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border-tertiary)] bg-white"
      style={{ borderBottomWidth: "0.5px", height: "56px", paddingInline: "24px", paddingBlock: "0" }}
    >
      <div className="hidden min-w-0 sm:block">
        <p className="truncate text-[15px] font-medium text-[#1C1C1A]">{greetingLine(firstName || "there", now)}</p>
        <p className="mt-0.5 hidden truncate text-[11px] text-[rgba(124,123,119,1)] md:block">{formatVendorDate(now)}</p>
      </div>
      <div className="min-w-0 flex-1 sm:hidden">
        <p className="truncate text-[15px] font-medium text-[#1C1C1A]">{shortGreeting(firstName || "there", now)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="flex size-8 items-center justify-center rounded-lg border border-[rgba(28,28,26,0.12)]">
          <NotificationBell compactToolbar initialUnreadCount={unreadCount} variant="light" />
        </div>
        <Link
          href="/dashboard/vendor/products/new"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-[rgba(212,69,10,0.35)] px-3 py-2 text-sm font-medium text-[#D4450A] hover:bg-[#FFF5F0] sm:px-4"
        >
          Add product
        </Link>
        <Link
          href="/dashboard/vendor/ai-assistant"
          className="hidden items-center justify-center whitespace-nowrap rounded-lg bg-[#D4450A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b83a09] md:inline-flex"
        >
          Analytics
        </Link>
      </div>
    </header>
  );
}
