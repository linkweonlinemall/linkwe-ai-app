import Link from "next/link";

import { getPublicServices } from "@/app/actions/services";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import PublicNav from "@/components/layout/PublicNav";
import { prisma } from "@/lib/prisma";
import { SERVICE_CATEGORIES } from "@/lib/categories";

const ALL_CATEGORIES = [{ value: "all", label: "All Services" }, ...SERVICE_CATEGORIES];

const SERVICE_TYPE_FILTERS = [
  { value: "all", label: "All types" },
  { value: "BOOKABLE", label: "📅 Bookable" },
  { value: "QUOTE", label: "💬 Quote" },
  { value: "SUBSCRIPTION", label: "🔄 Subscription" },
  { value: "ON_DEMAND", label: "⚡ On Demand" },
  { value: "VIRTUAL", label: "💻 Virtual" },
];

function serviceTypeInfo(type: string | null) {
  switch (type) {
    case "BOOKABLE":
      return { label: "Bookable", color: "bg-blue-50 text-blue-700", icon: "📅" };
    case "QUOTE":
      return { label: "Get Quote", color: "bg-amber-50 text-amber-700", icon: "💬" };
    case "SUBSCRIPTION":
      return { label: "Subscribe", color: "bg-purple-50 text-purple-700", icon: "🔄" };
    case "ON_DEMAND":
      return { label: "On Demand", color: "bg-emerald-50 text-emerald-700", icon: "⚡" };
    case "VIRTUAL":
      return { label: "Virtual", color: "bg-zinc-100 text-zinc-700", icon: "💻" };
    default:
      return { label: "Service", color: "bg-zinc-100 text-zinc-700", icon: "🛎️" };
  }
}

type Props = {
  searchParams: Promise<{ category?: string; type?: string; q?: string; sort?: string }>;
};

export default async function ServicesPage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;

  const category = params.category && params.category !== "all" ? params.category : undefined;
  const serviceType = params.type && params.type !== "all" ? params.type : undefined;
  const q = params.q || undefined;
  const sort = params.sort ?? "featured";

  const services = await getPublicServices({ category, serviceType, q, sort });

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 sm:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
      />

      {/* Hero search bar */}
      <div className="bg-[#1C1C1A] py-5">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <form action="/services" method="get" className="flex gap-2">
            {category ? <input type="hidden" name="category" value={category} /> : null}
            {serviceType ? <input type="hidden" name="type" value={serviceType} /> : null}
            {sort !== "featured" ? <input type="hidden" name="sort" value={sort} /> : null}
            <input
              defaultValue={q ?? ""}
              name="q"
              placeholder="Search services — hairdresser, plumber, tutor..."
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:bg-white/15 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl px-5 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: "#D4450A" }}
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Category strip */}
      <div className="border-b border-zinc-200 bg-white shadow-sm">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="flex gap-1.5 overflow-x-auto py-2.5 scrollbar-hide">
            {ALL_CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={cat.value === "all" ? "/services" : `/services?category=${cat.value}`}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  (!category && cat.value === "all") || category === cat.value
                    ? "bg-[#D4450A] text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">
              {category
                ? SERVICE_CATEGORIES.find((c) => c.value === category)?.label ?? "Services"
                : q
                  ? `Results for "${q}"`
                  : "All Services"}
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {services.length} service{services.length !== 1 ? "s" : ""} from local providers
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SERVICE_TYPE_FILTERS.map((f) => (
              <Link
                key={f.value}
                href={
                  f.value === "all"
                    ? `/services${category ? `?category=${category}` : ""}`
                    : `/services?type=${f.value}${category ? `&category=${category}` : ""}`
                }
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  (!serviceType && f.value === "all") || serviceType === f.value
                    ? "bg-[#1C1C1A] text-white"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>

        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-24 text-center">
            <span className="mb-4 text-6xl">🛎️</span>
            <h2 className="mb-2 text-lg font-bold text-zinc-900">No services found</h2>
            <p className="mb-6 text-sm text-zinc-500">Try a different category or search term</p>
            <Link
              href="/services"
              className="rounded-full bg-[#D4450A] px-5 py-2 text-sm font-semibold text-white"
            >
              Browse all services
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {services.map((service) => {
              const typeInfo = serviceTypeInfo(service.serviceType);
              return (
                <Link
                  key={service.id}
                  href={`/service/${service.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200">
                    {service.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={service.images[0]}
                        alt={service.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl">🛎️</div>
                    )}
                    <div className="absolute left-2.5 top-2.5">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${typeInfo.color}`}>
                        {typeInfo.icon} {typeInfo.label}
                      </span>
                    </div>
                    {service.isFeatured ? (
                      <div className="absolute right-2.5 top-2.5">
                        <span className="rounded-full bg-[#D4450A] px-2.5 py-1 text-[10px] font-bold text-white">
                          Featured
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div>
                      <p className="text-xs font-medium text-zinc-400">{service.store.name}</p>
                      <p className="mt-0.5 text-sm font-bold leading-snug text-zinc-900 transition-colors group-hover:text-[#D4450A]">
                        {service.name}
                      </p>
                    </div>
                    <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-2">
                      <div>
                        <p className="text-sm font-black text-[#D4450A]">TTD {service.price.toFixed(2)}</p>
                        {service.serviceDuration ? (
                          <p className="text-[10px] text-zinc-400">{service.serviceDuration} min</p>
                        ) : null}
                      </div>
                      {service.requiresDeposit && service.depositAmount ? (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-600">
                          TTD {service.depositAmount.toFixed(0)} deposit
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
