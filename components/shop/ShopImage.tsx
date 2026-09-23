"use client";
import Image from "next/image";
import { useState } from "react";
import { ImageIcon } from "lucide-react";

/** Optimise supported upload providers while retaining other vendor image URLs. */
export default function ShopImage({src,alt,hero=false}:{src?:string|null;alt:string;hero?:boolean}) {
  const [failed,setFailed] = useState<string|null>(null);
  if (!src || src === failed) return <div className="flex h-full w-full items-center justify-center text-[#7e9274]" role="img" aria-label={`${alt} — photo coming soon`}><ImageIcon size={32} strokeWidth={1.3} aria-hidden /></div>;
  const optimisable = src.startsWith("/") || /^https:\/\/(res\.cloudinary\.com|lh3\.googleusercontent\.com)\//.test(src);
  return <Image src={src} alt={alt} fill sizes={hero ? "(max-width: 700px) 180px, 280px" : "(max-width: 700px) 50vw, (max-width: 950px) 33vw, 350px"} loading={hero ? "eager" : "lazy"} unoptimized={!optimisable} onError={()=>setFailed(src)} />;
}
