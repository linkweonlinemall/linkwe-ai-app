import Link from "next/link";
import { notFound } from "next/navigation";

import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import PublicNav from "@/components/layout/PublicNav";
import { getServiceCategoryLabel } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

function serviceTypeDisplay(type: string | null) {
  switch (type) {
    case "BOOKABLE":
      return {
        label: "Bookable",
        description: "Pick a date and time that works for you",
        icon: "📅",
        color: "bg-blue-50 text-blue-700 border-blue-100",
      };
    case "QUOTE":
      return {
        label: "Quote-based",
        description: "Request a quote and the provider will respond",
        icon: "💬",
        color: "bg-amber-50 text-amber-700 border-amber-100",
      };
    case "SUBSCRIPTION":
      return {
        label: "Subscription",
        description: "Recurring service — weekly, fortnightly, or monthly",
        icon: "🔄",
        color: "bg-purple-50 text-purple-700 border-purple-100",
      };
    case "ON_DEMAND":
      return {
        label: "On Demand",
        description: "Request now and the provider will come to you",
        icon: "⚡",
        color: "bg-emerald-50 text-emerald-700 border-emerald-100",
      };
    case "VIRTUAL":
      return {
        label: "Virtual",
        description: "Delivered online via video call or link",
        icon: "💻",
        color: "bg-zinc-100 text-zinc-700 border-zinc-200",
      };
    default:
      return {
        label: "Service",
        description: "Contact the provider for details",
        icon: "🛎️",
        color: "bg-zinc-100 text-zinc-700 border-zinc-200",
      };
  }
}

function locationDisplay(loc: string | null) {
  switch (loc) {
    case "AT_VENDOR":
      return "At provider's location";
    case "AT_CUSTOMER":
      return "At your location";
    case "VIRTUAL":
      return "Online / Virtual";
    case "FLEXIBLE":
      return "Flexible — discuss with provider";
    default:
      return null;
  }
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;

  const service = await prisma.product.findUnique({
    where: { slug: slug.trim().toLowerCase() },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      shortDescription: true,
      price: true,
      compareAtPrice: true,
      images: true,
      category: true,
      tags: true,
      isPublished: true,
      isArchived: true,
      isService: true,
      serviceType: true,
      serviceLocation: true,
      serviceDuration: true,
      requiresDeposit: true,
      depositAmount: true,
      isFeatured: true,
      store: { select: { name: true, slug: true, logoUrl: true, region: true } },
    },
  });

  if (!service || !service.isPublished || !service.isService || service.isArchived) notFound();

  const typeInfo = serviceTypeDisplay(service.serviceType);
  const location = locationDisplay(service.serviceLocation);

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 sm:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-400">
          <Link href="/" className="hover:text-zinc-700">
            Home
          </Link>
          <span>/</span>
          <Link href="/services" className="hover:text-zinc-700">
            Services
          </Link>
          <span>/</span>
          <Link
            href={`/store/${service.store.slug}?tab=services`}
            className="max-w-32 truncate hover:text-zinc-700"
          >
            {service.store.name}
          </Link>
          <span>/</span>
          <span className="max-w-48 truncate text-zinc-600">{service.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-5 lg:col-span-2">
            <div className="aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-200 to-zinc-300">
              {service.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={service.images[0]} alt={service.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-6xl">🛎️</div>
              )}
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {service.category ? (
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                    {getServiceCategoryLabel(service.category)}
                  </span>
                ) : null}
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${typeInfo.color}`}>
                  {typeInfo.icon} {typeInfo.label}
                </span>
                {service.isFeatured ? (
                  <span className="rounded-full bg-[#D4450A] px-2.5 py-0.5 text-xs font-bold text-white">
                    Featured
                  </span>
                ) : null}
              </div>
              <h1 className="text-3xl font-black text-zinc-900">{service.name}</h1>
            </div>

            {service.description ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-900">
                  About this service
                </h2>
                <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-600">{service.description}</p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-900">Service details</h2>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3 rounded-xl bg-zinc-50 p-3">
                  <span className="text-xl">{typeInfo.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{typeInfo.label}</p>
                    <p className="text-xs text-zinc-500">{typeInfo.description}</p>
                  </div>
                </div>
                {service.serviceDuration ? (
                  <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                    <span className="text-xl">⏱️</span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {service.serviceDuration >= 60
                          ? `${Math.floor(service.serviceDuration / 60)}h${
                              service.serviceDuration % 60 > 0
                                ? ` ${service.serviceDuration % 60}m`
                                : ""
                            }`
                          : `${service.serviceDuration} minutes`}
                      </p>
                      <p className="text-xs text-zinc-500">Session duration</p>
                    </div>
                  </div>
                ) : null}
                {location ? (
                  <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                    <span className="text-xl">📍</span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{location}</p>
                      <p className="text-xs text-zinc-500">Service location</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {service.tags && service.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {service.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-3xl font-black" style={{ color: "#D4450A" }}>
                TTD {service.price.toFixed(2)}
              </p>
              {service.serviceDuration ? (
                <p className="mt-0.5 text-xs text-zinc-400">
                  per session · {service.serviceDuration} min
                </p>
              ) : null}

              {service.requiresDeposit && service.depositAmount ? (
                <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
                  <p className="text-xs font-semibold text-amber-700">
                    TTD {service.depositAmount.toFixed(2)} deposit required to book
                  </p>
                </div>
              ) : null}

              <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-center">
                <p className="mb-2 text-2xl">🔧</p>
                <p className="text-sm font-bold text-zinc-900">Booking coming soon</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Online booking for this service is being set up. Contact the provider directly in the meantime.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-400">Provided by</p>
              <div className="mb-3 flex items-center gap-3">
                {service.store.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={service.store.logoUrl}
                    alt=""
                    className="h-11 w-11 rounded-full border border-zinc-100 object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D4450A]/10">
                    <span className="font-bold text-[#D4450A]">{service.store.name[0]}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{service.store.name}</p>
                  {service.store.region ? (
                    <p className="text-xs capitalize text-zinc-400">{service.store.region}</p>
                  ) : null}
                </div>
              </div>
              <Link
                href={`/store/${service.store.slug}?tab=services`}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                View all services →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
