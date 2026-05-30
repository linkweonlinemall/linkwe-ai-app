"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export type PerformerEntry = {
  name?: string;
  role?: string;
  type?: string;
  imageUrl?: string;
};

const TYPE_BADGE: Record<string, string> = {
  DJ: "bg-[#D4450A]/20 text-[#D4450A]",
  Artist: "bg-amber-500/20 text-amber-300",
  Band: "bg-blue-500/20 text-blue-300",
  Performer: "bg-green-500/20 text-green-300",
  Host: "bg-zinc-500/20 text-zinc-300",
  "Special Guest": "bg-purple-500/20 text-purple-300",
};

const CARD_TYPE_BADGE: Record<string, string> = {
  DJ: "bg-[#D4450A]/10 text-[#D4450A]",
  Artist: "bg-amber-50 text-amber-700",
  Band: "bg-blue-50 text-blue-700",
  Performer: "bg-green-50 text-green-700",
  Host: "bg-gray-100 text-gray-600",
  "Special Guest": "bg-purple-50 text-purple-700",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

type Props = {
  performers: PerformerEntry[];
};

export default function LineupLightbox({ performers }: Props) {
  const [selected, setSelected] = useState<PerformerEntry | null>(null);

  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (selected) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selected]);

  return (
    <>
      {/* ── Performer grid ── */}
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
        {performers.map((p, i) => {
          const clickable = !!p.imageUrl;
          return (
            <div
              key={i}
              className={`flex flex-col items-center text-center ${clickable ? "cursor-pointer group" : ""}`}
              onClick={() => clickable && setSelected(p)}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(p);
                      }
                    }
                  : undefined
              }
              aria-label={clickable ? `View ${p.name ?? "performer"} photo` : undefined}
            >
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt={p.name ?? "Performer"}
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-transparent transition-all group-hover:ring-[#D4450A] group-hover:ring-offset-2"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#D4450A] text-sm font-bold text-white">
                  {getInitials(p.name ?? "?")}
                </div>
              )}
              <p className="mt-2 text-sm font-semibold text-[#1C1C1A] leading-tight">{p.name}</p>
              {p.role && (
                <p className="text-xs text-zinc-500 leading-tight">{p.role}</p>
              )}
              {p.type && (
                <span
                  className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${CARD_TYPE_BADGE[p.type] ?? "bg-zinc-100 text-zinc-600"}`}
                >
                  {p.type}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Lightbox — backdrop + centred container ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 cursor-pointer"
          onClick={() => setSelected(null)}
          aria-modal="true"
          role="dialog"
          aria-label={`Photo of ${selected.name ?? "performer"}`}
        >
          {/* Image container — 95 vw/vh, stops click propagation */}
          <div
            className="relative h-[87vh] w-[87vw] overflow-hidden rounded-xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image or initials fill */}
            {selected.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.imageUrl}
                alt={selected.name ?? "Performer"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#D4450A] text-6xl font-bold text-white">
                {getInitials(selected.name ?? "?")}
              </div>
            )}

            {/* Bottom gradient — inside container */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/90 to-transparent" />

            {/* Performer info — bottom left inside container */}
            <div className="pointer-events-none absolute bottom-8 left-8">
              <p className="text-3xl font-bold text-white">{selected.name}</p>
              {selected.role && (
                <p className="mt-1 text-lg text-white/70">{selected.role}</p>
              )}
              {selected.type && (
                <span
                  className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${TYPE_BADGE[selected.type] ?? "bg-zinc-500/20 text-zinc-300"}`}
                >
                  {selected.type}
                </span>
              )}
            </div>

            {/* Close button — top right of container */}
            <button
              type="button"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
