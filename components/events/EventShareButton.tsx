"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

type Props = {
  title: string;
  url: string;
  glass?: boolean;
};

export function EventShareButton({ title, url, glass = false }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available — silently ignore
    }
  }

  const glassClass =
    "relative flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white backdrop-blur-sm transition-all hover:bg-white/25";
  const defaultClass =
    "relative flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-all hover:border-[#D4450A] hover:text-[#D4450A]";

  return (
    <button
      onClick={handleShare}
      title={copied ? "Link copied!" : "Share event"}
      className={glass ? glassClass : defaultClass}
    >
      {copied ? (
        <Check className="size-4 text-emerald-400" strokeWidth={2.5} />
      ) : (
        <Share2 className="size-4" strokeWidth={2} />
      )}
      {copied && (
        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
          Link copied!
        </span>
      )}
    </button>
  );
}
