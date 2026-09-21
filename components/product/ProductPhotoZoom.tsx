"use client";

import { Maximize, Minus, Plus, Move } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import StorefrontImage from "@/components/storefront/StorefrontImage";
import { clampPhotoPan, clampPhotoZoom, zoomPhotoAt, MAX_PHOTO_ZOOM, type PhotoPoint } from "@/lib/product/gallery";
import styles from "./gallery.module.css";

type View = { zoom: number; pan: PhotoPoint };
type Gesture = { points: PhotoPoint[]; view: View };

export default function ProductPhotoZoom({ src, alt }: { src: string; alt: string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const current = useRef<View>({ zoom: 1, pan: { x: 0, y: 0 } });
  const [view, setView] = useState<View>({ zoom: 1, pan: { x: 0, y: 0 } });
  const pointers = useRef(new Map<number, PhotoPoint>());
  const gesture = useRef<Gesture | null>(null);
  const [dragging, setDragging] = useState(false);

  function update(next: View) {
    const box = viewport.current;
    const zoom = clampPhotoZoom(next.zoom);
    const value = { zoom, pan: clampPhotoPan(next.pan, zoom, box?.clientWidth ?? 0, box?.clientHeight ?? 0) };
    current.current = value;
    setView(value);
  }
  function changeZoom(value: number, focal = { x: 0, y: 0 }) {
    const zoom = clampPhotoZoom(value);
    update({ zoom, pan: zoomPhotoAt(current.current.pan, current.current.zoom, zoom, focal) });
  }
  function rebaseGesture() {
    gesture.current = pointers.current.size ? { points: [...pointers.current.values()], view: current.current } : null;
    setDragging(pointers.current.size > 0);
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    rebaseGesture();
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.current.values()];
    const start = gesture.current;
    if (points.length >= 2 && start.points.length >= 2) {
      const distance = (a: PhotoPoint, b: PhotoPoint) => Math.hypot(a.x - b.x, a.y - b.y);
      const midpoint = (a: PhotoPoint, b: PhotoPoint) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      const box = event.currentTarget.getBoundingClientRect();
      const origin = midpoint(start.points[0], start.points[1]);
      const next = midpoint(points[0], points[1]);
      const zoom = clampPhotoZoom(start.view.zoom * distance(points[0], points[1]) / Math.max(1, distance(start.points[0], start.points[1])));
      const pan = zoomPhotoAt(start.view.pan, start.view.zoom, zoom, { x: origin.x - box.left - box.width / 2, y: origin.y - box.top - box.height / 2 });
      update({ zoom, pan: { x: pan.x + next.x - origin.x, y: pan.y + next.y - origin.y } });
    } else if (start.view.zoom > 1) {
      update({ zoom: start.view.zoom, pan: { x: start.view.pan.x + points[0].x - start.points[0].x, y: start.view.pan.y + points[0].y - start.points[0].y } });
    }
  }
  function pointerEnd(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    rebaseGesture();
  }

  return <div className={styles.zoomWorkspace}>
    <div ref={viewport} className={styles.zoomViewport} role="group" aria-label="Zoomable photo" tabIndex={0}
      data-zoomed={view.zoom > 1} data-dragging={dragging}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd}
      onDoubleClick={event => { const box = event.currentTarget.getBoundingClientRect(); changeZoom(view.zoom > 1 ? 1 : 2.5, { x: event.clientX - box.left - box.width / 2, y: event.clientY - box.top - box.height / 2 }); }}
      onKeyDown={event => {
        if (["+", "=", "-", "0"].includes(event.key)) { event.preventDefault(); event.stopPropagation(); changeZoom(event.key === "0" ? 1 : view.zoom + (event.key === "-" ? -.5 : .5)); }
        if (view.zoom > 1 && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
          event.preventDefault(); event.stopPropagation();
          update({ zoom: view.zoom, pan: { x: view.pan.x + (event.key === "ArrowLeft" ? 60 : event.key === "ArrowRight" ? -60 : 0), y: view.pan.y + (event.key === "ArrowUp" ? 60 : event.key === "ArrowDown" ? -60 : 0) } });
        }
      }}>
      <div className={styles.zoomPhoto} style={{ transform: `translate(${view.pan.x}px, ${view.pan.y}px) scale(${view.zoom})` }}><StorefrontImage src={src} alt={alt} eager /></div>
    </div>
    <div className={styles.zoomTools}>
      <span className={styles.zoomHint}><Move size={14} aria-hidden />{view.zoom > 1 ? "Drag to explore" : "Pinch or double-click to zoom"}</span>
      <div className={styles.zoomButtons} role="group" aria-label="Photo zoom controls">
        <button type="button" onClick={() => changeZoom(view.zoom - .5)} disabled={view.zoom <= 1} aria-label="Zoom out"><Minus size={18} aria-hidden /></button>
        <output aria-live="polite" aria-label="Zoom level">{Math.round(view.zoom * 100)}%</output>
        <button type="button" onClick={() => changeZoom(view.zoom + .5)} disabled={view.zoom >= MAX_PHOTO_ZOOM} aria-label="Zoom in"><Plus size={18} aria-hidden /></button>
        <button type="button" className={styles.resetZoom} onClick={() => update({ zoom: 1, pan: { x: 0, y: 0 } })} aria-label="Reset zoom"><Maximize size={16} aria-hidden /><span>Fit</span></button>
      </div>
    </div>
  </div>;
}
