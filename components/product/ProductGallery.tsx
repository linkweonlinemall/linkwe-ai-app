"use client";

import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("center center");
  const touchStartX = useRef<number | null>(null);
  const didSwipe = useRef(false);

  const orderedUnique = useMemo(() => Array.from(new Set(images)), [images]);
  const hasMultiple = orderedUnique.length > 1;
  const safeIdx = Math.min(Math.max(0, selectedIdx), Math.max(orderedUnique.length - 1, 0));
  const mainSrc = orderedUnique[safeIdx];

  const goTo = useCallback((next: number) => {
    if (orderedUnique.length === 0) return;
    setSelectedIdx((next + orderedUnique.length) % orderedUnique.length);
  }, [orderedUnique.length]);

  function onTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    didSwipe.current = false;
  }

  function onTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const distance = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 42 || !hasMultiple) return;
    didSwipe.current = true;
    goTo(distance < 0 ? safeIdx + 1 : safeIdx - 1);
  }

  useEffect(() => {
    if (!isLightboxOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsLightboxOpen(false);
      if (event.key === "ArrowLeft") goTo(safeIdx - 1);
      if (event.key === "ArrowRight") goTo(safeIdx + 1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [goTo, isLightboxOpen, safeIdx]);

  if (!mainSrc) {
    return (
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[1.75rem] border border-white bg-gradient-to-br from-zinc-100 to-sky-50 font-sans text-sm font-bold text-zinc-400 shadow-[0_24px_70px_rgba(38,73,96,.12)]">
        Product image coming soon
      </div>
    );
  }

  const stage = (lightbox = false) => (
    <div
      className={`relative flex touch-pan-y items-center justify-center overflow-hidden ${lightbox ? "h-full w-full" : "aspect-square rounded-[1.75rem] border border-white bg-gradient-to-br from-white via-sky-50/70 to-orange-50/60 shadow-[0_24px_70px_rgba(38,73,96,.15)] ring-1 ring-sky-950/[.05]"}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        type="button"
        className={`absolute inset-0 z-0 flex items-center justify-center ${lightbox ? "p-4 sm:p-12" : "p-5 sm:p-8"}`}
        onClick={() => {
          if (!lightbox && !didSwipe.current) setIsLightboxOpen(true);
          didSwipe.current = false;
        }}
        aria-label={lightbox ? `${name}, image ${safeIdx + 1}` : `Open ${name} image ${safeIdx + 1} full screen`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={name}
          src={mainSrc}
          draggable={false}
          className={`h-full w-full select-none object-contain transition-[transform,opacity] duration-500 ease-out ${!lightbox && isZoomed ? "scale-[1.45]" : "scale-100"}`}
          style={!lightbox ? { transformOrigin: zoomOrigin } : undefined}
        />
      </button>

      {!lightbox ? (
        <button type="button" onClick={() => setIsLightboxOpen(true)} className="absolute right-4 top-4 z-20 flex size-11 items-center justify-center rounded-2xl border border-white/80 bg-white/85 text-zinc-800 shadow-[0_10px_28px_rgba(38,73,96,.14)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white" aria-label="View full screen">
          <Expand className="size-4.5" />
        </button>
      ) : null}

      {hasMultiple ? (
        <>
          <button type="button" onClick={() => goTo(safeIdx - 1)} className={`absolute left-3 z-20 flex size-11 items-center justify-center rounded-full border transition sm:left-5 ${lightbox ? "border-white/15 bg-white/10 text-white hover:bg-white/20" : "border-white bg-white/90 text-zinc-900 shadow-lg hover:bg-white"}`} aria-label="Previous product image"><ChevronLeft className="size-5" /></button>
          <button type="button" onClick={() => goTo(safeIdx + 1)} className={`absolute right-3 z-20 flex size-11 items-center justify-center rounded-full border transition sm:right-5 ${lightbox ? "border-white/15 bg-white/10 text-white hover:bg-white/20" : "border-white bg-white/90 text-zinc-900 shadow-lg hover:bg-white"}`} aria-label="Next product image"><ChevronRight className="size-5" /></button>
          <span className={`absolute bottom-4 left-4 z-20 rounded-full px-3 py-1.5 text-[11px] font-black tabular-nums backdrop-blur ${lightbox ? "bg-white/10 text-white" : "bg-zinc-950/75 text-white shadow-lg"}`}>{safeIdx + 1} / {orderedUnique.length}</span>
        </>
      ) : null}
    </div>
  );

  return (
    <div
      className="w-full min-w-0 max-w-full font-sans"
      onMouseEnter={() => setIsZoomed(true)}
      onMouseLeave={() => {
        setIsZoomed(false);
        setZoomOrigin("center center");
      }}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setZoomOrigin(`${((event.clientX - rect.left) / rect.width) * 100}% ${((event.clientY - rect.top) / rect.height) * 100}%`);
      }}
    >
      {stage()}

      {hasMultiple ? (
        <div role="tablist" aria-label={`${name} thumbnails`} className="hide-scrollbar mt-3 flex snap-x gap-2 overflow-x-auto pb-2">
          {orderedUnique.map((img, index) => (
            <button key={`${img}-${index}`} type="button" onClick={() => setSelectedIdx(index)} aria-label={`View image ${index + 1}`} aria-current={safeIdx === index ? "true" : undefined} className={`h-16 w-16 shrink-0 snap-start overflow-hidden rounded-2xl border-2 bg-white p-1 shadow-sm transition-all sm:h-20 sm:w-20 ${safeIdx === index ? "border-[#1A7FB5] shadow-[0_8px_24px_rgba(26,127,181,.18)]" : "border-white ring-1 ring-zinc-200 hover:border-sky-200"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="h-full w-full rounded-xl object-cover" draggable={false} />
            </button>
          ))}
        </div>
      ) : null}

      {isLightboxOpen ? (
        <div className="fixed inset-0 z-[100] bg-[#050b10]/95 p-2 backdrop-blur-xl sm:p-6" role="dialog" aria-modal="true" aria-label={`${name} image viewer`}>
          <button type="button" onClick={() => setIsLightboxOpen(false)} className="absolute right-4 top-4 z-30 flex size-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:right-7 sm:top-7" aria-label="Close image viewer"><X className="size-5" /></button>
          {stage(true)}
          {hasMultiple ? <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 gap-2">{orderedUnique.map((_, index) => <button key={index} type="button" onClick={() => setSelectedIdx(index)} aria-label={`View image ${index + 1}`} className={`h-1.5 rounded-full transition-all ${safeIdx === index ? "w-7 bg-sky-400" : "w-2 bg-white/35"}`} />)}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
