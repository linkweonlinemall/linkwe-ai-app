"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4 text-center">
        <main>
          <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#D4450A]">
            Something went wrong
          </p>
          <h1 className="mb-2 text-2xl font-bold text-zinc-900">LinkWe will be right back</h1>
          <p className="text-sm text-zinc-500">The problem has been reported automatically.</p>
        </main>
      </body>
    </html>
  );
}
