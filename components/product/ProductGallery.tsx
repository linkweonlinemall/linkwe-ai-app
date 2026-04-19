"use client";

import { useState } from "react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [selectedImage, setSelectedImage] = useState(images[0] ?? "");
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("center center");

  if (images.length === 0) {
    return (
      <div className="aspect-square w-full rounded-2xl border border-zinc-200 bg-zinc-200" aria-hidden />
    );
  }

  const mainSrc = selectedImage || images[0];

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white"
        style={{ aspectRatio: "1/1" }}
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={name}
          src={mainSrc}
          className="h-full w-full object-contain p-4 transition-transform duration-300 ease-in-out"
          style={{
            transform: isZoomed ? "scale(1.6)" : "scale(1)",
            transformOrigin: zoomOrigin,
          }}
        />
      </div>

      {images.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((img, i) => (
            <button
              key={img}
              type="button"
              onClick={() => setSelectedImage(img)}
              className={`h-16 w-16 overflow-hidden rounded-xl border-2 transition-all ${
                selectedImage === img
                  ? "border-[#D4450A] shadow-sm"
                  : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={`${name} thumbnail ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
