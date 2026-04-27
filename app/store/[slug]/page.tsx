import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PublicNav from "@/components/layout/PublicNav";
import StorefrontTabs from "@/components/storefront/StorefrontTabs";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function getDashboardPath(role: string) {
  if (role === "VENDOR") return "/dashboard/vendor";
  if (role === "COURIER") return "/dashboard/courier";
  if (role === "ADMIN") return "/dashboard/admin";
  return "/dashboard/customer";
}

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
  const continueHref = navUser ? getDashboardPath(navUser.role) : null;

  const { slug } = await params;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    notFound();
  }

  const store = await prisma.store.findUnique({
    where: { slug: normalized },
    select: {
      id: true,
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

  const socialLinks = (store.socialLinks as Record<string, string> | null) ?? {};
  const hasSocialLinks = Object.keys(socialLinks).length > 0;

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
    <div className="min-h-screen" style={{ backgroundColor: "var(--surface)" }}>
      <PublicNav
        transparent
        user={
          navUser
            ? { name: navUser.fullName ?? "Account", href: continueHref! }
            : null
        }
        dashboardHref={continueHref ?? undefined}
      />

      <section className="relative w-full" style={{ height: "clamp(180px, 28vw, 320px)" }}>
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
        <div className="flex items-end gap-4 sm:gap-5">
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
      </section>

      <StorefrontTabs
        store={store}
        products={products}
        openingHours={openingHours}
        socialLinks={socialLinks}
        hasSocialLinks={hasSocialLinks}
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
