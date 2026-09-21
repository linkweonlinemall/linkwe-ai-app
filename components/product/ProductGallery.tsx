"use client";

import { ArrowLeft, ArrowRight, ZoomIn, X, ImageIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import StorefrontImage from "@/components/storefront/StorefrontImage";
import ProductPhotoZoom from "./ProductPhotoZoom";
import styles from "./gallery.module.css";

export function ProductGallery({ images, name, kind = "Product" }: { images: string[]; name: string; kind?: "Product" | "Service" }) {
  const photos = useMemo(() => [...new Set(images.filter(Boolean))], [images]);
  const [selected, setSelected] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const active = Math.min(selected, Math.max(photos.length - 1, 0));
  const dialog = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const step = (direction: number) => setSelected((active + direction + photos.length) % photos.length);
  function openViewer() { setViewerOpen(true); dialog.current?.showModal(); }
  function thumbnails(inViewer = false) {
    return <div className={styles.thumbnails} aria-label={inViewer ? "Image viewer photos" : `${kind} photos`}>{photos.map((src, index) => <button key={src} type="button" aria-label={`${inViewer ? "Show" : "View"} image ${index + 1}`} aria-pressed={index === active} onClick={() => setSelected(index)}><StorefrontImage src={src} alt="" /><span aria-hidden /></button>)}</div>;
  }

  if (!photos.length) return <div className={styles.empty}><ImageIcon size={40} strokeWidth={1.2} aria-hidden /><span>{kind} photo coming soon</span></div>;
  return <div className={styles.gallery}>
    <div className={styles.stage} onTouchStart={event => { const touch = event.touches[0]; touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null; swiped.current = false; }} onTouchEnd={event => {
      const end = event.changedTouches[0];
      if (touchStart.current && end) {
        const dx = end.clientX - touchStart.current.x;
        const dy = end.clientY - touchStart.current.y;
        if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) { swiped.current = true; if (photos.length > 1) step(dx < 0 ? 1 : -1); }
      }
      touchStart.current = null;
    }}>
      <button className={styles.mainPhoto} onClick={() => { if (!swiped.current) openViewer(); swiped.current = false; }} type="button" aria-label={`Open ${name} image ${active + 1} full screen`}><StorefrontImage src={photos[active]} alt={`${name}, photo ${active + 1}`} eager /></button>
      <span className={styles.counter} aria-live="polite"><strong>{String(active + 1).padStart(2, "0")}</strong><span>/ {String(photos.length).padStart(2, "0")}</span></span>
      <button className={styles.openZoom} type="button" aria-label="View full screen" onClick={openViewer}><ZoomIn size={18} aria-hidden /><span>Zoom photo</span></button>
      {photos.length > 1 && <><button className={`${styles.photoArrow} ${styles.previous}`} type="button" onClick={() => step(-1)} aria-label={`Previous ${kind.toLowerCase()} image`}><ArrowLeft size={21} aria-hidden /></button><button className={`${styles.photoArrow} ${styles.next}`} type="button" onClick={() => step(1)} aria-label={`Next ${kind.toLowerCase()} image`}><ArrowRight size={21} aria-hidden /></button></>}
    </div>
    {photos.length > 1 && thumbnails()}
    <dialog ref={dialog} className={styles.lightbox} aria-label={`${name} image viewer`} onClose={() => setViewerOpen(false)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onKeyDown={event => {
      if (photos.length > 1 && ["ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); step(event.key === "ArrowLeft" ? -1 : 1); }
    }}>
      <div className={styles.viewerHeading}><div><span>THE CLOSER LOOK</span><strong>{name}</strong></div><button type="button" aria-label="Close image viewer" onClick={() => dialog.current?.close()}><X size={22} aria-hidden /></button></div>
      <div className={styles.viewerStage}>
        {viewerOpen && <ProductPhotoZoom key={photos[active]} src={photos[active]} alt={`${name}, photo ${active + 1}`} />}
        {photos.length > 1 && <><button className={`${styles.photoArrow} ${styles.previous}`} type="button" onClick={() => step(-1)} aria-label="Previous image"><ArrowLeft size={21} aria-hidden /></button><button className={`${styles.photoArrow} ${styles.next}`} type="button" onClick={() => step(1)} aria-label="Next image"><ArrowRight size={21} aria-hidden /></button></>}
      </div>
      <div className={styles.viewerFooter}>{photos.length > 1 && thumbnails(true)}<span aria-live="polite">Photo {active + 1} of {photos.length}</span></div>
    </dialog>
  </div>;
}
