import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import PublicNav from "@/components/layout/PublicNav";
import StorefrontTabs from "@/components/storefront/StorefrontTabs";

type TimeSlot = { from: string; to: string };
type DaySchedule = { closed: boolean; allDay: boolean; slots: TimeSlot[] };
type WeekSchedule = Record<string, DaySchedule>;

type Props = { params: Promise<{ slug: string }> };

function formatCategoryLabel(categoryId: string): string {
  return categoryId.replace(/_/g, " ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return { title: "Store — LinkWe", description: "Shop on LinkWe" };
  }

  const store = await prisma.store.findUnique({
    where: { slug: normalized },
    select: { name: true, tagline: true },
  });

  return {
    title: store ? `${store.name} — LinkWe` : "Store — LinkWe",
    description: store?.tagline ?? "Shop on LinkWe",
  };
}

export default async function PublicStorePage({ params }: Props) {
  const session = await getSession();
  const navUser = session
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
  const continueHref = navUser ? getRoleDashboardPath(navUser.role) : null;

  const { slug } = await params;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    notFound();
  }

  const store = await prisma.store.findUnique({
    where: { slug: normalized },
    select: {
      id: true,
      ownerId: true,
      name: true,
      slug: true,
      tagline: true,
      categoryId: true,
      region: true,
      logoUrl: true,
      description: true,
      coverPhotoUrl: true,
      images: {
        select: { id: true, url: true, position: true },
        orderBy: { position: "asc" },
      },
      openingHours: true,
      tags: true,
      amenities: true,
      policies: true,
      latitude: true,
      longitude: true,
      address: true,
      socialLinks: true,
      owner: {
        select: {
          fullName: true,
        },
      },
    },
  });

  if (!store) {
    notFound();
  }

  const isOwner = session != null && store.ownerId === session.userId;
  const isAdmin = session?.role === "ADMIN";
  const canEditStore = isOwner || isAdmin;

  const socialLinks = (store.socialLinks as Record<string, string> | null) ?? {};
  const hasSocialLinks = Object.keys(socialLinks).length > 0;

  const hdrs = await headers();
  const publicBase = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const origin =
    publicBase ?? (host ? `${proto}://${host}` : "https://linkwe.tt");
  const storeUrl = `${origin}/store/${store.slug}`;

  const openingHours =
    store.openingHours != null && typeof store.openingHours === "object"
      ? (store.openingHours as WeekSchedule)
      : null;

  const listings = await prisma.listing.findMany({
    where: {
      storeId: store.id,
      status: "PUBLISHED",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      priceMinor: true,
      shortDescription: true,
      imageUrl: true,
      createdAt: true,
    },
  });
  void listings;

  const products = await prisma.product.findMany({
    where: {
      storeId: store.id,
      isPublished: true,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: true,
      category: true,
      stock: true,
    },
  });

  const initials = store.name
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || store.name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen pb-16 sm:pb-0" style={{ backgroundColor: "var(--surface)" }}>
      <PublicNav
        transparent
        user={
          navUser
            ? { name: navUser.fullName ?? "Account", href: continueHref! }
            : null
        }
        dashboardHref={continueHref ?? undefined}
      />

      <section className="relative w-full" style={{ height: "clamp(240px, 38vw, 480px)" }}>
        {store.coverPhotoUrl ? (
          <img
            src={store.coverPhotoUrl}
            alt={`${store.name} cover`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, #1C1C1A 0%, #2E2D2A 40%, #45443F 100%)",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
        <div
          className="absolute bottom-0 left-0 right-0 h-24"
          style={{ background: "linear-gradient(to top, var(--surface), transparent)" }}
        />
      </section>

      <section
        className="relative px-4 pb-1 sm:px-6"
        style={{ maxWidth: 1024, margin: "0 auto", marginTop: -48 }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-1 items-end gap-4 sm:gap-5">
            <div
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl sm:h-24 sm:w-24"
              style={{
                border: "4px solid var(--surface)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              }}
            >
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-2xl font-bold text-white sm:text-3xl"
                  style={{ backgroundColor: "var(--scarlet)" }}
                >
                  {initials}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className="truncate text-xl font-bold sm:text-2xl"
                  style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
                >
                  {store.name}
                </h1>
              </div>
              {store.tagline ? (
                <p className="mt-0.5 truncate text-sm" style={{ color: "var(--text-muted)" }}>
                  {store.tagline}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {store.region ? (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    📍 {store.region.replace(/_/g, " ")}
                  </span>
                ) : null}
                {store.categoryId ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{
                      backgroundColor: "#F7F7F6",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--card-border-subtle)",
                    }}
                  >
                    {formatCategoryLabel(store.categoryId)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-start pb-1 sm:self-end">
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-md"
              title="Share store"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-zinc-600"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </a>
            {socialLinks.whatsapp ? (
              <a
                href={`https://wa.me/${socialLinks.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white transition-colors hover:bg-zinc-50"
                title="WhatsApp"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-green-500"
                  aria-hidden
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                </svg>
              </a>
            ) : null}
            <Link
              href="/chat"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-colors hover:border-zinc-300 hover:shadow-md"
              title="Message store"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-zinc-600"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <StorefrontTabs
        store={store}
        products={products}
        openingHours={openingHours}
        socialLinks={socialLinks}
        hasSocialLinks={hasSocialLinks}
        canEditStore={canEditStore}
      />

      <footer
        className="mt-8 px-4 py-6 text-center"
        style={{ borderTop: "1px solid var(--card-border-subtle)" }}
      >
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          <a href="/" style={{ color: "var(--scarlet)", textDecoration: "none" }}>
            LinkWe
          </a>{" "}
          — Trinidad & Tobago&apos;s Marketplace
        </p>
      </footer>
    </div>
  );
}
