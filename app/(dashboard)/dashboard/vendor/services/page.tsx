import Link from "next/link";

import { getVendorServices } from "@/app/actions/services";

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

export default async function VendorServicesPage() {
  const services = await getVendorServices();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
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
          {services.map((service) => {
            const type = serviceTypeLabel(service.serviceType);
            return (
              <div
                key={service.id}
                className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
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
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/dashboard/vendor/services/${service.id}/availability`}
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
