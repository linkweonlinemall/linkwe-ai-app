"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "linkwe:saved-events";

export default function SaveEventButton({ eventId, glass = false }: { eventId: string; glass?: boolean }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try { setSaved((JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]).includes(eventId)); } catch { /* ignore damaged local state */ }
  }, [eventId]);
  function toggle(event: React.MouseEvent) {
    event.preventDefault(); event.stopPropagation();
    let ids: string[] = [];
    try { ids = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]; } catch { ids = []; }
    const next = ids.includes(eventId) ? ids.filter((id) => id !== eventId) : [...ids, eventId];
    localStorage.setItem(KEY, JSON.stringify(next)); setSaved(next.includes(eventId));
  }
  return <button type="button" onClick={toggle} aria-label={saved ? "Remove saved event" : "Save event"} title={saved ? "Saved" : "Save event"} className={`flex size-10 items-center justify-center rounded-full border shadow-sm backdrop-blur transition hover:scale-105 ${glass ? "border-white/20 bg-white/15 text-white hover:bg-white/25" : saved ? "border-[#D4450A] bg-[#D4450A] text-white" : "border-white/70 bg-white/90 text-zinc-600 hover:text-[#D4450A]"}`}><Heart className={`size-[18px] ${saved ? "fill-current" : ""}`} strokeWidth={2}/></button>;
}
