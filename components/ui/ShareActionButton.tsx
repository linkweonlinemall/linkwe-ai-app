"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

type Props = { title: string; url?: string; className?: string; label?: string };

export default function ShareActionButton({ title, url, className = "", label = "Share" }: Props) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const shareUrl = url ?? window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url: shareUrl });
      else { await navigator.clipboard.writeText(shareUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        await navigator.clipboard.writeText(shareUrl).catch(() => undefined);
        setCopied(true); window.setTimeout(() => setCopied(false), 1800);
      }
    }
  }
  return <button type="button" onClick={() => void share()} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-orange-200 hover:text-[#D4450A] ${className}`}>{copied ? <Check className="size-4" /> : <Share2 className="size-4" />}{copied ? "Link copied" : label}</button>;
}
