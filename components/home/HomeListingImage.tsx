"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

/** Vendor media can come from several upload providers; preserve those URLs. */
export default function HomeListingImage({ src, alt }: { src?: string | null; alt: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!src || failedSource === src) return <div className="flex h-full w-full items-center justify-center bg-[#edece5] text-[#77786c]" role="img" aria-label={`${alt} — photo coming soon`}><ImageIcon size={36} strokeWidth={1.25} /></div>;
  // eslint-disable-next-line @next/next/no-img-element -- preserve vendor upload providers without changing global image configuration
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailedSource(src)} />;
}
