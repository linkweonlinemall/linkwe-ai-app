"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { deleteService, getVendorServices } from "@/app/actions/services";

function serviceTypeLabel(type: string | null) {
  switch (type) {
    case "BOOKABLE":
      return { label: "Bookable", color: "bg-blue-50 text-blue-700 border-blue-100" };
    case "QUOTE":
      return { label: "Quote", color: "bg-amber-50 text-amber-700 border-amber-100" };
    case "SUBSCRIPTION":
      return { label: "Subscription", color: "bg-purple-50 text-purple-700 border-purple-100" };
    case "ON_DEMAND":
      return { label: "On Demand", color: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    case "VIRTUAL":
      return { label: "Virtual", color: "bg-zinc-50 text-zinc-700 border-zinc-100" };
    default:
      return { label: type ?? "—", color: "bg-zinc-50 text-zinc-600 border-zinc-100" };
  }
}

type Service = Awaited<ReturnType<typeof getVendorServices>>[number];

export default function VendorServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    getVendorServices()
      .then((data) => {
        setServices(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === services.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(services.map((s) => s.id)));
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `Archive ${selectedIds.size} service${selectedIds.size > 1 ? "s" : ""}? They will be hidden from customers.`,
      )
    )
      return;
    const ids = [...selectedIds];
    setBulkLoading(true);
    for (const id of ids) {
      await deleteService(id);
    }
    setServices((prev) => prev.filter((s) => !ids.includes(s.id)));
    setSelectedIds(new Set());
    setBulkLoading(false);
  }

  if (loading) {
    return (
      <div className="px-6 py-8 max-w-full">
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-[#D4450A]" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">My Services</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {services.length} service{services.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/vendor/services/new"
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#D4450A" }}
        >
          + New service
        </Link>
      </div>

      {selectedIds.size > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#D4450A]/20 bg-[#D4450A]/5 px-4 py-3">
          <span className="text-xs font-semibold text-[#D4450A]">
            {selectedIds.size} selected
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              disabled={bulkLoading}
              onClick={() => void handleBulkDelete()}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              Archive selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-20 text-center">
          <span className="mb-4 text-5xl">🛎️</span>
          <h2 className="mb-2 text-lg font-bold text-zinc-900">No services yet</h2>
          <p className="mb-6 text-sm text-zinc-500">
            Create your first service to start accepting bookings
          </p>
          <Link
            href="/dashboard/vendor/services/new"
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: "#D4450A" }}
          >
            Create a service
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={selectedIds.size === services.length && services.length > 0}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded accent-[#D4450A]"
            />
            <span className="text-xs text-zinc-500">Select all</span>
          </div>

          {services.map((service) => {
            const type = serviceTypeLabel(service.serviceType);
            const isSelected = selectedIds.has(service.id);
            return (
              <div
                key={service.id}
                className={`flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition-all ${
                  isSelected ? "border-[#D4450A]/40 ring-1 ring-[#D4450A]/20" : "border-zinc-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(service.id)}
                  className="h-4 w-4 shrink-0 rounded accent-[#D4450A]"
                />
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                  {service.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={service.images[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">🛎️</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-900">{service.name}</p>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${type.color}`}>
                      {type.label}
                    </span>
                    {service.isPublished ? (
                      <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        Live
                      </span>
                    ) : (
                      <span className="rounded-full border border-zinc-100 bg-zinc-50 px-2.5 py-0.5 text-[10px] font-bold text-zinc-500">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    TTD {service.price.toFixed(2)}
                    {service.serviceDuration ? ` · ${service.serviceDuration} min` : ""}
                    {service.serviceLocation
                      ? ` · ${service.serviceLocation.replace("_", " ").toLowerCase()}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link
                    href="/dashboard/vendor/staff"
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                  >
                    Availability
                  </Link>
                  <Link
                    href={`/service/${service.slug}`}
                    target="_blank"
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                  >
                    View
                  </Link>
                  <Link
                    href={`/dashboard/vendor/services/${service.id}/edit`}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: "#D4450A" }}
                  >
                    Edit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
