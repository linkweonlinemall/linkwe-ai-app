"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
};

/**
 * Shared empty state: Sora via `font-sans`, centered, 80px vertical padding.
 */
export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
}: EmptyStateProps) {
  const hasLabel = Boolean(actionLabel?.trim());

  return (
    <div className="flex flex-col items-center px-4 py-20 text-center font-sans">
      <div className="mb-6 flex size-16 items-center justify-center text-zinc-400 [&_svg]:size-16 [&_svg]:shrink-0">
        {icon}
      </div>
      <h2 className="text-[20px] font-semibold leading-snug tracking-tight text-[#1C1C1A]">{title}</h2>
      <p className="mx-auto mt-3 max-w-[320px] text-sm leading-relaxed text-zinc-600">{description}</p>
      {hasLabel ? (
        <div className="mt-8">
          {actionOnClick ? (
            <button
              type="button"
              onClick={actionOnClick}
              className="inline-flex items-center justify-center rounded-xl bg-[#D4450A] px-8 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              {actionLabel}
            </button>
          ) : actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center justify-center rounded-xl bg-[#D4450A] px-8 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              {actionLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
