"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function OfflinePage() {
  useEffect(() => {
    document.title = "You are offline · LinkWe";
  }, []);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 text-center"
      style={{ background: "#1C1C1A" }}
    >
      <div className="mb-8">
        <img
          src="/icon-192x192.png"
          alt="LinkWe"
          className="mx-auto h-24 w-24 rounded-2xl"
        />
      </div>
      <h1
        className="mb-3 text-3xl font-black text-white"
        style={{ fontFamily: "Sora, sans-serif" }}
      >
        You are offline
      </h1>
      <p className="mb-8 max-w-sm text-sm text-zinc-400">
        No internet connection detected. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-xl px-8 py-3 text-sm font-bold text-white"
        style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
      >
        Try again
      </button>
      <Link
        href="/"
        className="mt-4 text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        Go to homepage
      </Link>
    </div>
  );
}
