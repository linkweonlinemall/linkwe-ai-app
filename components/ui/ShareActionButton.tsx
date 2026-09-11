"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

type Props = { title: string; text?: string; url?: string; className?: string; label?: string };

export default function ShareActionButton({ title, text, url, className = "", label = "Share" }: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const shareUrl = () => {
    const value = url ?? (typeof window === "undefined" ? "" : window.location.href);
    return value.startsWith("/") && typeof window !== "undefined" ? `${window.location.origin}${value}` : value;
  };
  const copy = async () => { await navigator.clipboard.writeText(shareUrl()); setCopied(true); setOpen(false); window.setTimeout(() => setCopied(false), 1800); };
  const nativeShare = async () => {
    try { if (navigator.share) await navigator.share({ title, text, url: shareUrl() }); else await copy(); }
    catch (error) { if ((error as DOMException)?.name !== "AbortError") await copy(); }
  };
  return <span className={`relative inline-flex ${open ? "z-[260]" : ""}`}><button type="button" onClick={() => setOpen(!open)} aria-label={`Share ${title}`} aria-expanded={open} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-orange-200 hover:text-[#D4450A] ${className}`}>{copied ? <Check className="size-4" /> : <Share2 className="size-4" />}{copied ? "Link copied" : label}</button>{open ? <><button type="button" className="fixed inset-0 z-[250] cursor-default" aria-label="Close share menu" onClick={() => setOpen(false)} /><span className="absolute right-0 top-[calc(100%+.5rem)] z-[260] w-52 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 text-zinc-900 shadow-[0_18px_55px_rgba(28,28,26,.22)]"><button type="button" onClick={() => void nativeShare()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-zinc-50"><Share2 className="size-4" /> Share…</button><button type="button" onClick={() => void copy()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-zinc-50"><Copy className="size-4" /> Copy link</button><a href={`https://wa.me/?text=${encodeURIComponent(`${text ?? title}\n${shareUrl()}`)}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-emerald-50">💬 WhatsApp</a><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl())}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-blue-50">ⓕ Facebook</a></span></> : null}</span>;
}
