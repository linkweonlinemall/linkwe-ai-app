"use client";

import Image from "next/image";
import { useState } from "react";
import { Sparkles, Ticket } from "lucide-react";
import styles from "./directory.module.css";

export default function EventPoster({ src, title, category, hero = false }: { src: string | null; title: string; category: string; hero?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className={styles.poster}>
    {src && !failed ? <Image src={src} alt={title} fill sizes={hero ? "(max-width: 700px) 80vw, 360px" : "(max-width: 600px) 90vw, (max-width: 950px) 45vw, 380px"} loading={hero ? "eager" : "lazy"} className={styles.posterImage} onError={() => setFailed(true)} unoptimized={!src.startsWith("/") && !src.includes("res.cloudinary.com")}/> :
      <div className={styles.posterFallback}><Ticket size={35} strokeWidth={1.2} aria-hidden/><span>{category}</span><strong>{title}</strong><Sparkles size={28} strokeWidth={1.2} aria-hidden/><small>MAKE A LITTLE ROOM FOR A GOOD TIME.</small></div>}
  </div>;
}
