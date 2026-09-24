"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, TriangleAlert } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

/** Keep workspace navigation available when a single vendor page fails. */
export default function VendorPageError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-orange-100 text-[#D4450A]">
        <TriangleAlert size={26} aria-hidden />
      </span>
      <h1 className="text-2xl font-bold tracking-tight text-[#163d3a]">This section couldn’t load</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-[#657a75]">
        Try loading it again, or use the menu to open another part of your dashboard.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => unstable_retry())}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#D4450A] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          <RefreshCw size={17} className={pending ? "animate-spin" : ""} aria-hidden />
          {pending ? "Loading…" : "Try again"}
        </button>
        <Link href="/dashboard/vendor" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#dce4d4] bg-white px-5 py-3 text-sm font-semibold text-[#163d3a]">
          <ArrowLeft size={17} aria-hidden />
          Back to overview
        </Link>
      </div>
      {error.digest && <p className="mt-5 text-xs text-[#657a75]">Support reference: {error.digest}</p>}
    </main>
  );
}
