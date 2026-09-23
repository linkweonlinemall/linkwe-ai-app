"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, Music2, X } from "lucide-react";
import StorefrontImage from "@/components/storefront/StorefrontImage";
import ProductPhotoZoom from "@/components/product/ProductPhotoZoom";
import type { EventPerformer } from "@/lib/events/detail";
import styles from "./detail.module.css";

export type PerformerEntry = EventPerformer;
export default function LineupLightbox({ performers }: { performers: PerformerEntry[] }) {
  const [selected, setSelected] = useState<PerformerEntry | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <div className={styles.lineup}>
      {performers.map((performer, index) => <article key={index}>
        {performer.imageUrl ? <button type="button" className={styles.performerPhoto} aria-label={"View " + (performer.name || "performer") + " photo"} onClick={() => { setSelected(performer); dialog.current?.showModal(); }}><StorefrontImage src={performer.imageUrl} alt={performer.name || "Performer"}/><span><ArrowUpRight size={17} aria-hidden/></span></button> : <div className={styles.performerPhoto}><Music2 size={35} strokeWidth={1.2} aria-hidden/></div>}
        {performer.type && <small>{performer.type}</small>}<h3>{performer.name || "Performer"}</h3>{performer.role && <p>{performer.role}</p>}
      </article>)}
    </div>
    <dialog ref={dialog} className={styles.performerDialog} aria-label={"Photo of " + (selected?.name || "performer")} onClose={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className={styles.performerDialogHeading}><div><small>MEET THE LINEUP</small><h2>{selected?.name}</h2><p>{[selected?.role, selected?.type].filter(Boolean).join(" · ")}</p></div><button type="button" aria-label="Close performer photo" onClick={() => dialog.current?.close()}><X size={23} aria-hidden/></button></div>
      {selected?.imageUrl && <ProductPhotoZoom key={selected.imageUrl} src={selected.imageUrl} alt={selected.name || "Performer"}/>}
    </dialog>
  </>;
}
