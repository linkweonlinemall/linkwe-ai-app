"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getOperationsMapData } from "@/app/actions/admin-map";

type MapData = Awaited<ReturnType<typeof getOperationsMapData>>;

function getRegionCoordinates(region: string | null): { lat: number; lng: number } | null {
  if (!region) return null;
  const r = region.toLowerCase().replace(/\s+/g, "_");
  const coords: Record<string, { lat: number; lng: number }> = {
    port_of_spain: { lat: 10.6549, lng: -61.5019 },
    san_fernando: { lat: 10.2796, lng: -61.4681 },
    chaguanas: { lat: 10.5167, lng: -61.4167 },
    tunapuna: { lat: 10.6333, lng: -61.3833 },
    arima: { lat: 10.6333, lng: -61.2833 },
    arouca: { lat: 10.6333, lng: -61.35 },
    diego_martin: { lat: 10.6833, lng: -61.5667 },
    san_juan: { lat: 10.65, lng: -61.4667 },
    trincity: { lat: 10.6167, lng: -61.35 },
    el_dorado: { lat: 10.6167, lng: -61.4 },
    carapichaima: { lat: 10.45, lng: -61.4167 },
    couva: { lat: 10.4167, lng: -61.45 },
    princes_town: { lat: 10.2667, lng: -61.3833 },
    sangre_grande: { lat: 10.5833, lng: -61.1333 },
    point_fortin: { lat: 10.1667, lng: -61.6833 },
    siparia: { lat: 10.1333, lng: -61.5 },
    tobago: { lat: 11.1833, lng: -60.7333 },
    scarborough: { lat: 11.1833, lng: -60.7333 },
  };
  return coords[r] ?? coords["port_of_spain"] ?? null;
}

export default function MapTab() {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").Marker[]>([]);
  const [leafletReady, setLeafletReady] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    async function load() {
      const data = await getOperationsMapData();
      setMapData(data);
      setLastUpdated(new Date());
      setLoading(false);
    }

    void load();
    interval = setInterval(() => void load(), 15000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (leafletMapRef.current) return;

    void import("leaflet").then((L) => {
      if (!mapRef.current || leafletMapRef.current) return;
      const map = L.map(mapRef.current, {
        center: [10.6549, -61.5019],
        zoom: 10,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      leafletMapRef.current = map;
      setLeafletReady(true);
    });
  }, [mapReady]);

  useEffect(() => {
    if (!leafletMapRef.current || !mapData || !leafletReady) return;

    void import("leaflet").then((L) => {
      const map = leafletMapRef.current;
      if (!map) return;

      markersRef.current.forEach((m) => {
        m.remove();
      });
      markersRef.current = [];

      mapData.activeCouriers.forEach((courier) => {
        const isStale = mapData.staleIds.includes(courier.courierId);
        const activeJob = courier.courier.shipments[0];

        const icon = L.divIcon({
          html: `<div style="
          background: ${isStale ? "#A1A1AA" : "#D4450A"};
          width: 32px; height: 32px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 14px; font-weight: bold;
        ">🚗</div>`,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([courier.latitude, courier.longitude], { icon })
          .addTo(map)
          .bindPopup(`
          <strong>${courier.courier.fullName}</strong><br/>
          ${courier.courier.region ?? "Unknown region"}<br/>
          ${isStale ? "<span style='color:red'>⚠ Position stale</span>" : "Active"}<br/>
          ${activeJob ? `Job: ${activeJob.shipmentStatus}` : "No active job"}
        `);

        markersRef.current.push(marker);
      });

      mapData.pendingPickups.forEach((pickup) => {
        const store = pickup.inboundForSplitOrder?.store;
        const regionSource =
          store?.region != null
            ? String(store.region)
            : pickup.region != null
              ? String(pickup.region)
              : null;
        const regionPin = getRegionCoordinates(regionSource);

        const fromLat = store?.latitude != null ? Number(store.latitude) : null;
        const fromLng = store?.longitude != null ? Number(store.longitude) : null;
        const lat =
          fromLat != null && !Number.isNaN(fromLat) ? fromLat : (regionPin?.lat ?? null);
        const lng =
          fromLng != null && !Number.isNaN(fromLng) ? fromLng : (regionPin?.lng ?? null);
        if (lat == null || lng == null) return;

        const icon = L.divIcon({
          html: `<div style="
      background: #E8820C;
      width: 28px; height: 28px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 14px;
    ">📦</div>`,
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(
            `<strong>${store?.name ?? "Pickup"}</strong><br/>` +
              `Awaiting courier pickup<br/>` +
              `${(regionSource ?? "").replace(/_/g, " ")}`,
          );

        markersRef.current.push(marker);
      });

      mapData.warehouseLocations.forEach((wh) => {
        const addr = wh.address;
        const fromLat = addr?.latitude != null ? Number(addr.latitude) : null;
        const fromLng = addr?.longitude != null ? Number(addr.longitude) : null;
        const regionPin = getRegionCoordinates(addr?.region != null ? String(addr.region) : null);
        const lat =
          fromLat != null && !Number.isNaN(fromLat) ? fromLat : (regionPin?.lat ?? null);
        const lng =
          fromLng != null && !Number.isNaN(fromLng) ? fromLng : (regionPin?.lng ?? null);
        if (lat == null || lng == null) return;

        const icon = L.divIcon({
          html: `<div style="
          background: #1A7FB5;
          width: 28px; height: 28px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 12px;
        ">🏭</div>`,
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(`
          <strong>${wh.name}</strong><br/>
          ${wh.address ? `${wh.address.line1}, ${wh.address.city}` : ""}<br/>
          ${wh.address?.region?.replace(/_/g, " ") ?? ""}
        `);

        markersRef.current.push(marker);
      });
    });
  }, [mapData, leafletReady]);

  const panToCourier = useCallback((courierId: string, lat: number, lng: number) => {
    setSelectedCourier(courierId);
    const map = leafletMapRef.current;
    if (map) {
      map.setView([lat, lng], 13);
      setTimeout(() => map.invalidateSize(), 50);
    }
  }, []);

  useEffect(() => {
    if (loading || !leafletMapRef.current) return;
    const map = leafletMapRef.current;
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [loading]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Operations Map</h2>
          <p className="mt-0.5 text-sm text-zinc-500">Live courier positions · Trinidad & Tobago</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ backgroundColor: "#22C55E" }}
              />
              <span
                className="relative inline-flex h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "#22C55E" }}
              />
            </span>
            <span className="text-xs font-semibold text-zinc-700">Live</span>
            {lastUpdated ? (
              <span className="text-xs text-zinc-400">
                ·{" "}
                {new Date(lastUpdated).toLocaleTimeString("en-TT", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-4 gap-3">
        {[
          {
            label: "Active Couriers",
            value: mapData?.activeCouriers.length ?? 0,
            color: "#D4450A",
            icon: "🚗",
          },
          {
            label: "Stale Positions",
            value: mapData?.staleIds.length ?? 0,
            color: mapData?.staleIds.length ? "#E8820C" : "#1B8C5A",
            icon: "⚠",
          },
          {
            label: "Unclaimed Pickups",
            value: mapData?.pendingPickups.length ?? 0,
            color: mapData?.pendingPickups.length ? "#E8820C" : "#1B8C5A",
            icon: "📦",
          },
          {
            label: "Warehouses",
            value: mapData?.warehouseLocations.length ?? 0,
            color: "#1A7FB5",
            icon: "🏭",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
              style={{ backgroundColor: `${card.color}15` }}
            >
              {card.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{card.value}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div
          className="relative overflow-hidden rounded-2xl border border-zinc-200 shadow-sm lg:col-span-3"
          style={{ height: "580px" }}
        >
          {loading && !mapData ? (
            <div className="absolute inset-0 z-10 flex h-full items-center justify-center bg-zinc-50">
              <p className="text-sm text-zinc-400">Loading map...</p>
            </div>
          ) : null}
          <div ref={mapRef} style={{ height: "580px", width: "100%" }} />
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto lg:col-span-1" style={{ maxHeight: "580px" }}>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Active Couriers</p>
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "#D4450A" }}
              >
                {mapData?.activeCouriers.length ?? 0}
              </span>
            </div>
            <div className="divide-y divide-zinc-50">
              {mapData?.activeCouriers.length === 0 ? (
                <p className="px-4 py-4 text-center text-xs text-zinc-400">No active couriers</p>
              ) : (
                mapData?.activeCouriers.map((courier) => {
                  const isStale = mapData.staleIds.includes(courier.courierId);
                  const activeJob = courier.courier.shipments?.[0];
                  return (
                    <button
                      key={courier.courierId}
                      type="button"
                      onClick={() => panToCourier(courier.courierId, courier.latitude, courier.longitude)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 ${
                        selectedCourier === courier.courierId ? "bg-zinc-50" : ""
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: isStale ? "#A1A1AA" : "#D4450A" }}
                        >
                          {courier.courier.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div
                          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white"
                          style={{ backgroundColor: isStale ? "#A1A1AA" : "#22C55E" }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-900">{courier.courier.fullName}</p>
                        <p className="truncate text-xs capitalize text-zinc-400">
                          {courier.courier.region?.replace(/_/g, " ")}
                          {isStale ? " · ⚠ Stale" : ""}
                        </p>
                        {activeJob ? (
                          <p className="mt-0.5 text-xs font-medium" style={{ color: "#E8820C" }}>
                            {activeJob.shipmentStatus?.replace(/_/g, " ").toLowerCase()}
                          </p>
                        ) : null}
                      </div>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Unclaimed Pickups</p>
              {(mapData?.pendingPickups.length ?? 0) > 0 ? (
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: "#E8820C" }}
                >
                  {mapData?.pendingPickups.length}
                </span>
              ) : null}
            </div>
            <div className="divide-y divide-zinc-50">
              {mapData?.pendingPickups.length === 0 ? (
                <p className="px-4 py-4 text-center text-xs text-zinc-400">No unclaimed pickups</p>
              ) : (
                mapData?.pendingPickups.map((pickup) => {
                  const store = pickup.inboundForSplitOrder?.store;
                  return (
                    <div key={pickup.id} className="px-4 py-3">
                      <p className="truncate text-sm font-semibold text-zinc-900">{store?.name ?? "Unknown store"}</p>
                      <p className="mt-0.5 truncate text-xs capitalize text-zinc-400">
                        {store?.region?.replace(/_/g, " ") ?? pickup.region?.replace(/_/g, " ")}
                      </p>
                      <p className="mt-1 text-xs font-medium" style={{ color: "#E8820C" }}>
                        Waiting for courier
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Legend</p>
            <div className="flex flex-col gap-2">
              {[
                { color: "#D4450A", label: "Active courier" },
                { color: "#A1A1AA", label: "Stale position (5+ min)" },
                { color: "#E8820C", label: "Unclaimed pickup" },
                { color: "#1A7FB5", label: "Warehouse" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-zinc-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
