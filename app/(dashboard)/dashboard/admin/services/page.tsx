import Link from "next/link";
import { redirect } from "next/navigation";
import { ServiceType, type Prisma } from "@prisma/client";
import { ArrowUpRight, Sparkles, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { servicePrice } from "@/lib/services/display";
import { optionLabel } from "@/lib/admin/record-design";
import AdminPageHeader from "../components/admin-page-header";
import { ServiceActions } from "./service-controls";
export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    storeId?: string;
    status?: string;
    type?: string;
  }>;
}) {
  if ((await getSession())?.role !== "ADMIN") redirect("/login");
  const {
    q = "",
    page: rawPage = "1",
    storeId = "",
    status = "all",
    type = "",
  } = await searchParams;
  const where: Prisma.ProductWhereInput = {
    isService: true,
    ...(q
      ? {
          OR: [
            { name: { contains: q.slice(0, 100), mode: "insensitive" } },
            {
              store: {
                name: { contains: q.slice(0, 100), mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
    ...(storeId ? { storeId } : {}),
    ...(Object.values(ServiceType).includes(type as ServiceType)
      ? { serviceType: type as ServiceType }
      : {}),
    ...(status === "archived"
      ? { isArchived: true }
      : status === "published"
        ? { isArchived: false, isPublished: true }
        : status === "draft"
          ? { isArchived: false, isPublished: false }
          : {}),
  };
  const total = await prisma.product.count({ where });
  const pages = Math.max(1, Math.ceil(total / 18));
  const page = Math.min(pages, Math.max(1, parseInt(rawPage) || 1));
  const [rows, stores] = await Promise.all([
    prisma.product.findMany({
      where,
      take: 18,
      skip: (page - 1) * 18,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        images: true,
        price: true,
        serviceType: true,
        quotePriceType: true,
        subscriptionInterval: true,
        isPublished: true,
        isArchived: true,
        store: { select: { id: true, name: true } },
        _count: {
          select: {
            bookings: true,
            onDemandRequests: true,
            customerServiceSubscriptions: true,
          },
        },
      },
    }),
    prisma.store.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const pageUrl = (number: number) =>
    `?${new URLSearchParams({ q, storeId, status, type, page: String(number) })}`;
  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Services"
        description="Make local expertise easy to find and book. Manage every service model, its availability and customer requirements."
        createHref={`/dashboard/admin/records/service/new${storeId ? `?storeId=${storeId}` : ""}`}
        createLabel="Add service"
      />
      <form className="admin-filterbar">
        <div className="relative min-w-48 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-4 text-zinc-400"
          />
          <input
            className="admin-input pl-10"
            name="q"
            defaultValue={q}
            placeholder="Service or store name…"
            aria-label="Search services"
          />
        </div>
        <select
          name="storeId"
          className="admin-input"
          defaultValue={storeId}
          aria-label="Filter by store"
        >
          <option value="">All stores</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
        <select
          name="type"
          className="admin-input"
          defaultValue={type}
          aria-label="Service model"
        >
          <option value="">All service models</option>
          {Object.values(ServiceType).map((value) => (
            <option key={value} value={value}>
              {optionLabel(value)}
            </option>
          ))}
        </select>
        <select
          name="status"
          className="admin-input"
          defaultValue={status}
          aria-label="Publication status"
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
          <option value="archived">Archived</option>
        </select>
        <button className="admin-button admin-button-primary">
          Apply filters
        </button>
        {(q || storeId || type || status !== "all") && (
          <Link href="/dashboard/admin/services" className="admin-button">
            Clear
          </Link>
        )}
      </form>
      <div className="mb-4 flex justify-between">
        <p className="admin-muted">
          {total} service{total === 1 ? "" : "s"}
        </p>
        <p className="admin-muted">
          Page {page} of {pages}
        </p>
      </div>
      <div className="admin-service-grid">
        {rows.map((row) => (
          <article className="admin-service-card" key={row.id}>
            <div className="admin-service-image">
              {row.images[0] ? (
                <img src={row.images[0]} alt={row.name} loading="lazy" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Sparkles size={40} className="text-[#83a89a]" />
                </div>
              )}
              <span className="admin-badge">
                {row.isArchived
                  ? "Archived"
                  : row.isPublished
                    ? "Published"
                    : "Draft"}
              </span>
            </div>
            <div className="admin-service-body">
              <Link
                className="text-[10px] font-semibold uppercase tracking-wider text-[#6d8887]"
                href={`/dashboard/admin/records/store/${row.store.id}`}
              >
                {row.store.name}
              </Link>
              <h2>{row.name}</h2>
              <p className="admin-muted">
                {row.serviceType
                  ? optionLabel(row.serviceType)
                  : "Service type not set"}
              </p>
              <p className="mt-3 font-semibold text-[#c04411]">
                {servicePrice(row).label}
              </p>
              <p className="mt-1 text-[10px] text-[#7e9096]">
                {servicePrice(row).note}
              </p>
              <div className="admin-service-meta">
                <span>{row._count.bookings} bookings</span>
                <span>{row._count.onDemandRequests} requests</span>
                <span>
                  {row._count.customerServiceSubscriptions} subscribers
                </span>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/admin/records/service/${row.id}`}
                  className="admin-button admin-button-primary flex-1"
                >
                  Manage service
                  <ArrowUpRight size={15} />
                </Link>
                <Link
                  href={`/service/${row.slug}`}
                  target="_blank"
                  className="admin-icon-button"
                  aria-label={`View ${row.name} on site`}
                >
                  <ArrowUpRight size={18} />
                </Link>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer py-2 text-[11px] text-[#809399]">
                  Archive or remove
                </summary>
                <ServiceActions
                  id={row.id}
                  name={row.name}
                  archived={row.isArchived}
                />
              </details>
            </div>
          </article>
        ))}
      </div>
      {!rows.length && (
        <div className="admin-empty">
          <Sparkles className="mx-auto mb-3" />
          <strong>No services found</strong>
          <p>Try clearing a filter or add a service for a local business.</p>
        </div>
      )}
      <nav
        aria-label="Service pages"
        className="mt-6 flex justify-between gap-3"
      >
        {page > 1 ? (
          <Link href={pageUrl(page - 1)} className="admin-button">
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        {page < pages && (
          <Link className="admin-button" href={pageUrl(page + 1)}>
            Next →
          </Link>
        )}
      </nav>
    </div>
  );
}
