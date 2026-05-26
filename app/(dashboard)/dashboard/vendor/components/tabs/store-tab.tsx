"use client";

import confetti from "canvas-confetti";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";

import { toastProfileComplete } from "@/lib/feedback/toasts";

type CompletenessItem = { label: string; done: boolean; detail?: string };

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Props = {
  storeId: string;
  store: {
    name: string;
    slug: string;
    logoUrl: string | null;
    tagline: string | null;
  };
  completenessItems: CompletenessItem[];
  completedCount: number;
  totalCount: number;
  verificationApprovedBanner?: ReactNode;
  verificationChecklist?: ReactNode;
};
function CompletionRing({
  completedCount,
  totalCount,
  completionFraction,
}: {
  completedCount: number;
  totalCount: number;
  completionFraction: number;
}) {
  const targetDash = completionFraction * CIRCUMFERENCE;
  const [dashLength, setDashLength] = useState(0);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setDashLength(targetDash));
    return () => window.cancelAnimationFrame(id);
  }, [targetDash]);

  return (
    <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:gap-5">
      <div className="relative grid shrink-0 place-items-center" style={{ width: 80, height: 80 }}>
        <svg width={80} height={80} viewBox="0 0 80 80" aria-hidden>
          <g transform="rotate(-90 40 40)">
            <circle
              cx={40}
              cy={40}
              r={RADIUS}
              fill="none"
              stroke="#F4F4F5"
              strokeWidth={8}
              strokeLinecap="round"
            />
            <circle
              cx={40}
              cy={40}
              r={RADIUS}
              fill="none"
              stroke="#D4450A"
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={`${dashLength} ${CIRCUMFERENCE}`}
              style={{
                transition: "stroke-dasharray 0.95s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-sans">
          <span className="text-[18px] font-semibold tracking-tight text-[#1C1C1A] tabular-nums">
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>
      <p className="text-center text-[13px] leading-snug text-zinc-500 sm:text-left">
        Complete each item so customers see a polished storefront profile.
      </p>
    </div>
  );
}

export default function StoreTab({
  storeId,
  store,
  completenessItems,
  completedCount,
  totalCount,
  verificationApprovedBanner,
  verificationChecklist,
}: Props) {
  const completionFraction = Math.min(1, Math.max(0, completedCount / Math.max(totalCount, 1)));

  useEffect(() => {
    if (completedCount < totalCount) return;

    const key = `lw_vendor_profile_complete_celebrate_${storeId}`;
    try {
      if (typeof window === "undefined") return undefined;

      if (localStorage.getItem(key)) return undefined;

      confetti({
        particleCount: 140,
        spread: 74,
        startVelocity: 28,
        origin: { x: 0.5, y: 0.28 },
        colors: ["#D4450A", "#FFB020", "#F5F5F5", "#1C1C1A"],
      });

      localStorage.setItem(key, "1");
      toastProfileComplete();
    } catch {
      return undefined;
    }
  }, [completedCount, totalCount, storeId]);

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="rounded-xl border border-zinc-200/60 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {store.logoUrl ? (
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-zinc-200">
              <img alt="" className="h-full w-full object-cover" src={store.logoUrl} />
            </div>
          ) : (
            <div className="h-16 w-16 shrink-0 rounded-full bg-zinc-100" />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-zinc-900">{store.name}</h2>
            {store.tagline ? (
              <p className="mt-0.5 truncate text-sm text-zinc-500">{store.tagline}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/dashboard/vendor/store/edit"
                className="inline-flex items-center rounded-lg bg-[#D4450A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#B83A08]"
              >
                Edit store
              </Link>
              <Link
                href={`/store/${store.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                View public store
              </Link>
            </div>
            {verificationApprovedBanner}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200/60 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 sm:mb-0">Store profile</h2>
          <CompletionRing
            completedCount={completedCount}
            totalCount={totalCount}
            completionFraction={completionFraction}
          />
        </div>

        <ul className="space-y-2 border-t border-zinc-100 pt-5">
          {completenessItems.map((item, index) => (
            <li key={`store-profile-complete-${index}`} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className={item.done ? "text-emerald-500" : "text-zinc-300"}>
                  {item.done ? "✓" : "○"}
                </span>
                <span className={item.done ? "text-zinc-700" : "text-zinc-400"}>
                  {item.label}
                </span>
              </span>
              {item.detail ? <span className="text-xs text-zinc-400">{item.detail}</span> : null}
            </li>
          ))}
        </ul>

        {verificationChecklist ? (
          <div className="mt-4 border-t border-zinc-100 pt-4">{verificationChecklist}</div>
        ) : null}
      </div>
    </div>
  );
}
