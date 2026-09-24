"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, X } from "lucide-react";
import s from "./photo-studio.module.css";

export default function PhotoZoom({ src, onClose }: { src: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  useEffect(() => {
    dialog.current?.showModal();
    const old = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = old; };
  }, []);
  useEffect(() => {
    const area = viewport.current;
    if (area) { area.scrollLeft = (area.scrollWidth - area.clientWidth) / 2; area.scrollTop = (area.scrollHeight - area.clientHeight) / 2; }
  }, [zoom]);
  return createPortal(<dialog ref={dialog} className={s.zoomDialog} aria-label="Inspect product photo" onCancel={onClose} onClose={onClose}>
    <div className={s.zoomHeading}><div><strong>A closer look</strong><small>Check the label, edges and details. Scroll or swipe to move around.</small></div><button type="button" onClick={onClose} aria-label="Close photo zoom"><X size={22} /></button></div>
    <div className={s.zoomViewport} ref={viewport} tabIndex={0} aria-label="Zoomed photo. Scroll to pan."><div style={{ width: `${zoom}%`, height: `${zoom}%` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Product photo enlarged for inspection" draggable={false} />
    </div></div>
    <div className={s.zoomControls}><button type="button" aria-label="Zoom out" disabled={zoom === 100} onClick={() => setZoom(Math.max(100, zoom - 25))}><Minus size={18} /></button><label><span>Zoom {zoom}%</span><input type="range" aria-label="Photo zoom" min="100" max="400" step="25" value={zoom} onChange={e => setZoom(Number(e.target.value))} /></label><button type="button" aria-label="Zoom in" disabled={zoom === 400} onClick={() => setZoom(Math.min(400, zoom + 25))}><Plus size={18} /></button><button type="button" onClick={() => setZoom(100)}>Fit</button></div>
    <p className={s.zoomNote}>Zoom is for viewing only. Use Crop to change the saved photo.</p>
  </dialog>, document.body);
}
