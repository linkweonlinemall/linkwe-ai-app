"use client";
import { useEffect, useRef } from "react";
import type { OperationsWorkspace } from "@/app/actions/admin-operations";
import "leaflet/dist/leaflet.css";

export default function WarehouseMap({ data }: { data: OperationsWorkspace }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | undefined;
    void import("leaflet").then((L) => {
      if (disposed || !ref.current) return;
      map = L.map(ref.current).setView([10.5, -61.3], 9);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
      const bounds: [number, number][] = [];
      const pin = (lat: unknown, lng: unknown, label: string, color: string) => {
        if (lat == null || lng == null || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;
        const point: [number, number] = [Number(lat), Number(lng)];
        if (Math.abs(point[0]) > 90 || Math.abs(point[1]) > 180) return;
        bounds.push(point);
        const text = document.createElement("span"); text.textContent = label;
        L.circleMarker(point, { radius: 8, color: "white", weight: 2, fillColor: color, fillOpacity: 0.95 }).addTo(map!).bindPopup(text);
      };
      data.warehouses.forEach((w) => pin(w.address?.latitude, w.address?.longitude, w.name, "#059669"));
      data.orders.forEach((o) => {
        pin(o.shippingAddress?.latitude, o.shippingAddress?.longitude, `${o.referenceNumber ?? o.id} · Customer · ${o.status.replaceAll("_", " ")}`, "#2563eb");
        o.splitOrders.filter((s) => !s.warehouseReceivedAt).forEach((s) => pin(s.store.latitude, s.store.longitude, `${s.store.name} · ${s.status.replaceAll("_", " ")}`, "#d4450a"));
      });
      if (bounds.length) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    });
    return () => { disposed = true; map?.remove(); };
  }, [data]);
  return <div><div ref={ref} className="relative z-0 h-[360px] w-full rounded-2xl sm:h-[480px]" aria-label="Warehouse, vendor and customer address map"/><p className="mt-3 text-xs text-zinc-500">Orange: vendors · Green: warehouse · Blue: customers. Saved address pins and staff-recorded statuses; CSF vehicle GPS is not connected. Locations without coordinates are omitted.</p></div>;
}
