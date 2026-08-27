"use client";

import Link from "next/link";
import { ChevronDown, MapPin, Store } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MapRef } from "react-map-gl/mapbox";

type MapStore = { id: string; name: string; slug: string; logoUrl: string | null; region: string; latitude: number | null; longitude: number | null };
type MapModules = { Map: typeof import("react-map-gl/mapbox").default; Marker: typeof import("react-map-gl/mapbox").Marker; NavigationControl: typeof import("react-map-gl/mapbox").NavigationControl };

export default function StoreDiscoveryMap({ stores }: { stores: MapStore[] }) {
  const [modules, setModules] = useState<MapModules | null>(null);
  const [region, setRegion] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const mapRef = useRef<MapRef | null>(null);
  const token = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "").trim();

  useEffect(() => {
    setExpanded(!window.matchMedia("(max-width: 767px)").matches);
    void import("mapbox-gl/dist/mapbox-gl.css");
    void import("react-map-gl/mapbox").then((m) => setModules({ Map: m.default, Marker: m.Marker, NavigationControl: m.NavigationControl }));
  }, []);

  const allPoints = useMemo(() => stores.filter((s): s is MapStore & { latitude: number; longitude: number } => s.latitude !== null && s.longitude !== null), [stores]);
  const regions = useMemo(() => [...new Set(allPoints.map((s) => s.region.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [allPoints]);
  const points = useMemo(() => region === "all" ? allPoints : allPoints.filter((s) => s.region === region), [allPoints, region]);
  const active = points.find((s) => s.id === selected);

  useEffect(() => {
    if (!expanded || points.length === 0) return;
    const longitude = points.reduce((sum, s) => sum + s.longitude, 0) / points.length;
    const latitude = points.reduce((sum, s) => sum + s.latitude, 0) / points.length;
    mapRef.current?.flyTo({ center: [longitude, latitude], zoom: region === "all" ? 9 : 12.2, duration: 1200, essential: true });
    setSelected(null);
  }, [expanded, points, region]);

  if (!token || allPoints.length === 0) return null;
  const Map = modules?.Map; const Marker = modules?.Marker; const NavigationControl = modules?.NavigationControl;

  return <section className="mt-6 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_20px_55px_rgba(28,28,26,0.12)]">
    <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-center gap-3 bg-gradient-to-r from-[#1C1C1A] to-[#33251f] px-4 py-4 text-left text-white md:pointer-events-none"><span className="flex size-10 items-center justify-center rounded-xl bg-[#D4450A]"><MapPin className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">Explore stores on the map</strong><span className="text-xs text-white/55">Browse populated LinkWe regions</span></span><ChevronDown className={`size-5 transition md:hidden ${expanded ? "rotate-180" : ""}`} /></button>
    {expanded ? <div className="relative"><div className="absolute left-3 right-14 top-3 z-10 md:left-5 md:right-auto md:w-80"><select aria-label="Filter map by region" value={region} onChange={(e) => setRegion(e.target.value)} className="w-full rounded-2xl border border-white/70 bg-white/95 px-4 py-3 text-sm font-semibold text-zinc-800 shadow-xl outline-none backdrop-blur focus:ring-4 focus:ring-orange-500/15"><option value="all">All populated regions ({allPoints.length})</option>{regions.map((name) => <option key={name} value={name}>{name} ({allPoints.filter((s) => s.region === name).length})</option>)}</select></div><div className="h-[340px] bg-zinc-100 md:h-[460px]">{Map && Marker && NavigationControl ? <Map ref={mapRef} mapboxAccessToken={token} initialViewState={{ longitude: -61.25, latitude: 10.48, zoom: 9 }} mapStyle="mapbox://styles/mapbox/streets-v12" style={{ width: "100%", height: "100%" }} scrollZoom cooperativeGestures><NavigationControl position="top-right" showCompass visualizePitch /><>{points.map((store, index) => <Marker key={store.id} longitude={store.longitude} latitude={store.latitude} anchor="bottom"><button type="button" onClick={() => setSelected(store.id)} title={store.name} style={{ animationDelay: `${Math.min(index * 70, 500)}ms` }} className={`animate-[lw-map-pin-in_500ms_cubic-bezier(.2,.8,.2,1)_both] flex size-11 items-center justify-center overflow-hidden rounded-2xl border-2 bg-white shadow-[0_8px_24px_rgba(28,28,26,0.28)] transition duration-300 hover:-translate-y-1 hover:scale-110 ${selected === store.id ? "border-[#D4450A] ring-4 ring-orange-500/20" : "border-white"}`}>{store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-cover" /> : <Store className="size-5 text-[#D4450A]" />}</button></Marker>)}</></Map> : <div className="h-full animate-pulse bg-zinc-100" />}</div>{active ? <Link href={`/store/${active.slug}`} className="absolute bottom-4 left-4 right-4 z-10 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/95 p-3 shadow-2xl backdrop-blur md:left-auto md:w-80"><span className="flex size-11 items-center justify-center overflow-hidden rounded-xl bg-orange-50">{active.logoUrl ? <img src={active.logoUrl} alt="" className="h-full w-full object-cover" /> : <Store className="size-5 text-[#D4450A]" />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-zinc-900">{active.name}</strong><span className="text-xs text-zinc-500">{active.region}</span></span><span className="text-xs font-bold text-[#D4450A]">View →</span></Link> : null}</div> : null}
  </section>;
}
