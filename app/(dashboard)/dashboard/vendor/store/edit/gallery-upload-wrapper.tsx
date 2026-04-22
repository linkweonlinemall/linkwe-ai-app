"use client";

import { useState, useEffect } from "react";
import type { ComponentProps } from "react";

type GalleryImage = { id: string; url: string; position: number };

type Props = {
  images: GalleryImage[];
  slotsAvailable: number;
};

export default function GalleryUploadWrapper({ images, slotsAvailable }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="border-t border-zinc-100 pt-6 mt-2">
        <h2 className="text-sm font-semibold text-zinc-900">Store gallery</h2>
        <p className="mt-1 text-sm text-zinc-600">{images.length}/10 photos.</p>
      </div>
    );
  }

  const GalleryUploadLazy = require("./gallery-upload").default;
  return <GalleryUploadLazy images={images} slotsAvailable={slotsAvailable} />;
}
