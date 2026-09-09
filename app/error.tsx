"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";

const RETRY_SECONDS = 15;

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [secondsUntilRetry, setSecondsUntilRetry] = useState(RETRY_SECONDS);

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  useEffect(() => {
    const countdown = window.setInterval(() => {
      setSecondsUntilRetry((seconds) => (seconds <= 1 ? RETRY_SECONDS : seconds - 1));
    }, 1_000);
    const retry = window.setInterval(reset, RETRY_SECONDS * 1_000);

    return () => {
      window.clearInterval(countdown);
      window.clearInterval(retry);
    };
  }, [reset]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F5] px-4 text-center">
      <Image
        src="/linkwe-logo-on-dark.png"
        alt="LinkWe"
        width={120}
        height={40}
        style={{ width: "auto", height: "40px" }}
        className="mb-8"
      />
      <p className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-[#D4450A]">
        Reconnecting
      </p>
      <h1 className="mb-2 text-2xl font-bold text-zinc-900">LinkWe will be right back</h1>
      <p className="mb-3 max-w-sm text-sm text-zinc-500">
        We are reconnecting to the marketplace. Your account and cart are safe.
      </p>
      <p className="mb-8 text-xs text-zinc-400" aria-live="polite">
        Trying again automatically in {secondsUntilRetry} seconds.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={reset}
          className="rounded-xl bg-[#D4450A] px-6 py-3 text-sm font-bold text-white hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
