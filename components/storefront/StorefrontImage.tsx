"use client";
import { useState } from "react";
import { ImageIcon } from "lucide-react";
export default function StorefrontImage({ src, alt, eager = false }: { src?: string | null; alt: string; eager?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || src === failed) return <span className="flex h-full w-full items-center justify-center bg-[#dceae5] text-[#486a63]" role="img" aria-label={`${alt} — photo coming soon`}><ImageIcon size={40} strokeWidth={1.2} aria-hidden /></span>;
  // eslint-disable-next-line @next/next/no-img-element -- preserve the store's supported upload providers
  return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailed(src)} />;
}
