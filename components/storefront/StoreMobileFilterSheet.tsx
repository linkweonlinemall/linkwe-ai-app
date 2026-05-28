"use client";

import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onReset: () => void;
  resultCount: number;
  resultLabel: string;
  children: ReactNode;
};

export default function StoreMobileFilterSheet({
  open,
  onClose,
  onReset,
  resultCount,
  resultLabel,
  children,
}: Props) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[190] bg-black/50 lg:hidden"
        aria-label="Close filters"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[200] max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-6 pt-3 lg:hidden">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-zinc-300" />
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-[var(--text-primary)]">Filters</p>
          <button
            type="button"
            className="text-xs font-semibold text-[#D4450A]"
            onClick={onReset}
          >
            Reset all
          </button>
        </div>
        {children}
        <button
          type="button"
          className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ backgroundColor: "#D4450A" }}
          onClick={onClose}
        >
          Show {resultCount} {resultLabel}
        </button>
      </div>
    </>
  );
}
