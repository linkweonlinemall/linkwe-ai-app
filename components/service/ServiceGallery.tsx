"use client";
import { useState } from "react";

type Props = {
  images: string[] | null | undefined;
  name: string;
};

export default function ServiceGallery({ images, name }: Props) {
  const safeImages = Array.isArray(images) ? images : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("center center");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (safeImages.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 text-6xl">
        🛎️
      </div>
    );
  }

  const activeImage = safeImages[activeIndex];

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin(`${x}% ${y}%`);
  }

  return (
    <>
      <div className="flex flex-col gap-3">

        {/* Main image with zoom */}
        <div
          className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white cursor-zoom-in"
          style={{ aspectRatio: "4/3" }}
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => { setIsZoomed(false); setZoomOrigin("center center"); }}
          onMouseMove={handleMouseMove}
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={activeImage}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 ease-in-out p-0"
            style={{
              transform: isZoomed ? "scale(1.5)" : "scale(1)",
              transformOrigin: zoomOrigin,
            }}
          />

          {/* Arrow nav */}
          {safeImages.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZoomed(false);
                  setActiveIndex((i) => (i === 0 ? safeImages.length - 1 : i - 1));
                }}
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm hover:bg-white transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
                style={{ opacity: 1 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZoomed(false);
                  setActiveIndex((i) => (i === safeImages.length - 1 ? 0 : i + 1));
                }}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm hover:bg-white transition-all"
                style={{ opacity: 1 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {/* Counter + expand hint */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <span className="rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                  {activeIndex + 1} / {safeImages.length}
                </span>
              </div>
              <div className="absolute bottom-3 right-3">
                <span className="rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                  🔍 Click to expand
                </span>
              </div>
            </>
          ) : (
            <div className="absolute bottom-3 right-3">
              <span className="rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                🔍 Click to expand
              </span>
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        {safeImages.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {safeImages.map((img, i) => (
              <button
                key={img}
                type="button"
                onClick={() => { setActiveIndex(i); setIsZoomed(false); }}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-150 ${
                  i === activeIndex
                    ? "border-[#D4450A] shadow-sm scale-105"
                    : "border-zinc-200 opacity-70 hover:opacity-100 hover:border-zinc-400"
                }`}
              >
                <img src={img} alt={`${name} ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 ? (
                  <span className="absolute bottom-0 left-0 right-0 bg-black/40 py-0.5 text-center text-[8px] font-bold uppercase tracking-wide text-white">
                    Cover
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Lightbox */}
      {lightboxOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close */}
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Nav */}
          {safeImages.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveIndex((i) => (i === 0 ? safeImages.length - 1 : i - 1)); }}
                className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveIndex((i) => (i === safeImages.length - 1 ? 0 : i + 1)); }}
                className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          ) : null}

          {/* Full image */}
          <img
            src={safeImages[activeIndex]}
            alt={name}
            className="max-h-[88vh] max-w-[88vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Thumbnail strip in lightbox */}
          {safeImages.length > 1 ? (
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2 overflow-x-auto rounded-2xl bg-black/40 p-2 backdrop-blur-sm">
              {safeImages.map((img, i) => (
                <button
                  key={img}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
                  className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                    i === activeIndex ? "border-[#D4450A] scale-110" : "border-transparent opacity-50 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}

          {/* Counter */}
          {safeImages.length > 1 ? (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {activeIndex + 1} / {safeImages.length}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
