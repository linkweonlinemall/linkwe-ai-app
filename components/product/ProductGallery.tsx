"use client";

import { useMemo, useState } from "react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("center center");

  const orderedUnique = useMemo(() => Array.from(new Set(images)), [images]);

  const hasMultiple = orderedUnique.length > 1;

  if (orderedUnique.length === 0) {
    return (
      <div
        className="aspect-[4/5] w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 font-sans"
        aria-hidden
      />
    );
  }

  const safeIdx = Math.min(Math.max(0, selectedIdx), orderedUnique.length - 1);
  const mainSrc = orderedUnique[safeIdx];
  const mainAspect = hasMultiple ? "aspect-square" : "aspect-[4/5]";

  return (
    <div className="w-full min-w-0 max-w-full font-sans">
      {/* Single main hero — clipped; zoom scaling cannot bleed past column */}
      <div
        className={`relative ${mainAspect} w-full max-w-full overflow-hidden rounded-lg border border-zinc-200 bg-white`}
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => {
          setIsZoomed(false);
          setZoomOrigin("center center");
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          setZoomOrigin(`${x}% ${y}%`);
        }}
      >
        <div className="absolute inset-0 overflow-hidden p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={name}
            src={mainSrc}
            className="h-full w-full object-contain transition-transform duration-300 ease-out"
            style={{
              transform: isZoomed ? "scale(1.5)" : "scale(1)",
              transformOrigin: zoomOrigin,
            }}
          />
        </div>
      </div>

      {hasMultiple ? (
        <div
          role="tablist"
          aria-label={`${name} thumbnails`}
          className="hide-scrollbar mt-3 flex max-w-full gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible"
        >
          {orderedUnique.map((img, i) => (
            <button
              key={`thumb-${img}-${i}`}
              type="button"
              onClick={() => setSelectedIdx(i)}
              aria-label={`View image ${i + 1}`}
              className={`h-[60px] w-[60px] shrink-0 snap-start overflow-hidden rounded-lg border-2 bg-zinc-50 transition-all md:h-20 md:w-20 md:rounded-md ${
                safeIdx === i ? "border-[#D4450A] shadow-sm" : "border-zinc-200 hover:border-zinc-400"
              }`}
              aria-current={safeIdx === i ? "true" : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="h-full w-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
