"use client";

import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type SavedEvent = { id:string; title:string; slug:string; startDate:string; coverImage:string|null; venueName:string|null; region:string|null; isOnline:boolean };
const KEY = "linkwe:saved-events";

export default function EventCollectionsClient() {
  const [events,setEvents]=useState<SavedEvent[]>([]); const [loading,setLoading]=useState(true); const [month,setMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));
  useEffect(()=>{let ids:string[]=[];try{ids=JSON.parse(localStorage.getItem(KEY)??"[]") as string[]}catch{} if(!ids.length){setLoading(false);return} fetch(`/api/events/collection?ids=${encodeURIComponent(ids.join(","))}`).then(r=>r.json()).then(data=>setEvents(data.events??[])).finally(()=>setLoading(false));},[]);
  const monthEvents=useMemo(()=>events.filter(e=>{const d=new Date(e.startDate);return d.getFullYear()===month.getFullYear()&&d.getMonth()===month.getMonth()}),[events,month]);
  const firstDay=new Date(month.getFullYear(),month.getMonth(),1).getDay(); const days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const cells=Array.from({length:firstDay+days},(_,i)=>i<firstDay?null:i-firstDay+1);
  const title=month.toLocaleDateString("en-TT",{month:"long",year:"numeric"});
  if(loading)return <div className="py-24 text-center text-sm text-zinc-500">Loading your event collection…</div>;
  return <div>
    <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-xl font-black text-zinc-950">{title}</h2><p className="text-xs text-zinc-500">{events.length} saved event{events.length===1?"":"s"}</p></div><div className="flex gap-2"><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))} className="flex size-10 items-center justify-center rounded-xl border border-zinc-200 bg-white"><ChevronLeft className="size-5"/></button><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))} className="flex size-10 items-center justify-center rounded-xl border border-zinc-200 bg-white"><ChevronRight className="size-5"/></button></div></div>
    {!events.length?<div className="rounded-3xl border border-dashed border-orange-200 bg-white py-20 text-center"><CalendarDays className="mx-auto size-12 text-orange-300"/><h3 className="mt-4 font-black">Your event calendar is ready</h3><p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">Tap the heart on an event to add it to this collection.</p><Link href="/events" className="mt-5 inline-flex rounded-xl bg-[#D4450A] px-5 py-3 text-sm font-bold text-white">Explore events</Link></div>:<>
      <div className="hidden overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm md:block"><div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-950 text-center text-[10px] font-black uppercase tracking-wider text-white">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} className="p-3">{d}</div>)}</div><div className="grid grid-cols-7">{cells.map((day,i)=>{const daily=day?monthEvents.filter(e=>new Date(e.startDate).getDate()===day):[];return <div key={i} className="min-h-32 border-b border-r border-zinc-100 p-2"><span className="text-xs font-bold text-zinc-400">{day}</span><div className="mt-2 space-y-1.5">{daily.map(e=><Link key={e.id} href={`/events/${e.slug}`} className="block rounded-lg bg-[#FFF0E8] px-2 py-1.5 text-[10px] font-bold leading-4 text-[#A8380D] hover:bg-orange-100">{new Date(e.startDate).toLocaleTimeString("en-TT",{hour:"numeric",minute:"2-digit"})} · {e.title}</Link>)}</div></div>})}</div></div>
      <div className="space-y-3 md:hidden">{monthEvents.length?monthEvents.map(e=><Link key={e.id} href={`/events/${e.slug}`} className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100">{e.coverImage?<img src={e.coverImage} alt="" className="h-full w-full object-cover"/>:<CalendarDays className="m-6 size-8 text-orange-300"/>}</div><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wider text-[#D4450A]">{new Date(e.startDate).toLocaleDateString("en-TT",{weekday:"short",day:"numeric",month:"short"})}</p><h3 className="mt-1 line-clamp-2 text-sm font-black">{e.title}</h3><p className="mt-1 flex items-center gap-1 truncate text-[11px] text-zinc-500"><MapPin className="size-3"/>{e.isOnline?"Online":e.venueName??e.region??"Venue to be announced"}</p></div></Link>):<p className="rounded-2xl bg-white py-12 text-center text-sm text-zinc-500">No saved events in {title}.</p>}</div>
    </>}
  </div>;
}
