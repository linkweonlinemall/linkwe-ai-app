"use client";

import { useEffect, useState, type FormEvent } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Simple mail-client signup overlay for services launch alerts. */
export default function ServicesLaunchNotifyModal({ open, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    const subject = encodeURIComponent("LinkWe services — notify me when providers go live");
    const body = encodeURIComponent(`Please notify me when local service providers launch on LinkWe:\n${trimmed}`);
    window.location.href = `mailto:admin@linkwemall.com?subject=${subject}&body=${body}`;
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 font-sans sm:items-center" role="dialog" aria-modal="true" aria-labelledby="services-notify-title">
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onClose} aria-label="Close dialog" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
        <h3 id="services-notify-title" className="text-lg font-semibold text-[#1C1C1A]">
          Get notified
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Leave your email and we&apos;ll let you know when service providers join LinkWe.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label htmlFor="services-notify-email" className="sr-only">
            Email address
          </label>
          <input
            id="services-notify-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(ev) => {
              setEmail(ev.target.value);
              if (error) setError(null);
            }}
            placeholder="you@email.com"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-[#1C1C1A] outline-none placeholder:text-zinc-400 focus:border-[#D4450A] focus:ring-2 focus:ring-[#D4450A]/15"
          />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button type="submit" className="flex-1 rounded-xl bg-[#D4450A] py-3 text-sm font-bold text-white hover:opacity-90">
              Send request
            </button>
          </div>
          <p className="text-center text-[11px] text-zinc-400">Opens your email app — we won&apos;t add you to a list automatically.</p>
        </form>
      </div>
    </div>
  );
}
