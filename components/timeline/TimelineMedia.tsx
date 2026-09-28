"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import s from "./timeline-media.module.css";

/** One active image defines the frame; neighbouring slides never stretch the post. */
export default function TimelineMedia({ images, storeName, detail = false }: { images: string[]; storeName: string; detail?: boolean }) {
  const [index, setIndex] = useState(0);
  const [ratio, setRatio] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const photo = useRef<HTMLImageElement>(null);
  const touch = useRef<{x:number;y:number}|null>(null);
  const swiped = useRef(false);
  const active = Math.min(index, Math.max(0, images.length - 1));
  const src = images[active];
  const fitPhoto = (image: HTMLImageElement) => {
    if (image.naturalWidth && image.naturalHeight) {
      setRatio(Math.max(.8, Math.min(1.91, image.naturalWidth / image.naturalHeight)));
    }
  };
  useEffect(() => {
    // Cached images can finish loading before hydration attaches onLoad.
    if (photo.current?.complete) fitPhoto(photo.current);
  }, [src]);
  const move = (value:number) => setIndex(Math.max(0, Math.min(images.length - 1, value)));
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (expanded && !node.open) node.showModal();
    if (!expanded && node.open) node.close();
    if (!expanded) return;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [expanded]);
  if (!src) return null;
  const touchHandlers = {
    onTouchStart: (e:React.TouchEvent) => { touch.current = {x:e.touches[0].clientX,y:e.touches[0].clientY}; swiped.current = false; },
    onTouchEnd: (e:React.TouchEvent) => { if (!touch.current) return; const dx = e.changedTouches[0].clientX-touch.current.x; const dy=e.changedTouches[0].clientY-touch.current.y; if(Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)){swiped.current=true;move(active+(dx<0?1:-1));} touch.current=null; },
  };
  const controls = <><button type="button" className={s.previous} disabled={active===0} aria-label="Previous photo" onClick={()=>move(active-1)}><ChevronLeft size={20}/></button><button type="button" className={s.next} disabled={active===images.length-1} aria-label="Next photo" onClick={()=>move(active+1)}><ChevronRight size={20}/></button><span className={s.count} aria-live="polite">{active+1} / {images.length}</span></>;
  return <div className={s.media} onKeyDown={e=>{if(e.key==="ArrowLeft"){e.preventDefault();move(active-1);} if(e.key==="ArrowRight"){e.preventDefault();move(active+1);}}}>
    <div className={s.frame} style={{aspectRatio:ratio,maxHeight:detail?"75svh":"640px"}} {...touchHandlers}>
      <button type="button" className={s.open} onClick={()=>{if(!swiped.current)setExpanded(true);}} aria-label={`Enlarge ${storeName} photo ${active+1}`}><img ref={photo} key={src} src={src} draggable={false} alt={`${storeName} · photo ${active+1}`} onLoad={e=>fitPhoto(e.currentTarget)}/><span className={s.expand}><Expand size={16}/></span></button>
      {images.length>1&&controls}
    </div>
    {images.length>1&&<div className={s.dots}>{images.map((_,i)=><button key={i} type="button" aria-label={`Show photo ${i+1}`} aria-pressed={i===active} onClick={()=>move(i)}><span/></button>)}</div>}
    <dialog ref={dialog} className={s.dialog} aria-label={`${storeName} photos`} onClose={()=>setExpanded(false)} onClick={e=>{if(e.target===e.currentTarget)setExpanded(false);}}><button autoFocus type="button" className={s.close} aria-label="Close photo" onClick={()=>setExpanded(false)}><X/></button><div className={s.full} {...touchHandlers}><img src={src} alt={`${storeName} · photo ${active+1}`}/></div>{images.length>1&&controls}</dialog>
  </div>;
}
