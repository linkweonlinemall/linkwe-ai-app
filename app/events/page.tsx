import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";

import PublicNav from "@/components/layout/PublicNav";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import { EventFilters } from "@/components/events/EventFilters";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Events in Trinidad & Tobago · LinkWe",
  description: "Concerts, fetes, food events, and more across Trinidad & Tobago. Buy tickets online.",
};

type SearchParams = {
  q?: string;
  category?: string;
  region?: string;
  date?: string;
  sort?: string;
};

function buildDateRange(
  dateFilter: string | undefined,
): { gte?: Date; lte?: Date } | null {
  const now = new Date();
  if (dateFilter === "this_week") {
    const end = new Date(now);
    end.setDate(now.getDate() + 7);
    return { gte: now, lte: end };
  }
  if (dateFilter === "this_weekend") {
    const day = now.getDay();
    const daysUntilSat = day === 0 ? 6 : 6 - day;
    const sat = new Date(now);
    sat.setDate(now.getDate() + daysUntilSat);
    sat.setHours(0, 0, 0, 0);
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    sun.setHours(23, 59, 59, 999);
    return { gte: sat, lte: sun };
  }
  if (dateFilter === "this_month") {
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { gte: now, lte: end };
  }
  // "All dates" (no filter) — return null so we don't add a startDate clause at all.
  // Previously defaulted to { gte: now } which hid any event with a past startDate.
  return null;
}

const HERO_CATEGORIES = [
  { label: "Fetes", value: "all_inclusive_fete" },
  { label: "Concerts", value: "soca_carnival" },
  { label: "Food", value: "food_fair" },
  { label: "Cultural", value: "cultural_festival" },
  { label: "Sports", value: "sports_tournament" },
  { label: "Business", value: "networking_event" },
];

export default async function EventsPage({
  searchParams: rawSearchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await rawSearchParams;

  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;

  const q = searchParams.q?.trim() ?? "";
  const category = searchParams.category ?? "";
  const region = searchParams.region ?? "";
  const sort = searchParams.sort ?? "soonest";
  const dateRange = buildDateRange(searchParams.date);
  const dateWhere = dateRange ? { startDate: dateRange } : {};

  const orderBy =
    sort === "latest"
      ? { startDate: "desc" as const }
      : { startDate: "asc" as const };

  // Only apply full-text search when q is a non-empty string.
  // An empty string passed to Prisma `contains` matches every row in Postgres.
  const searchWhere =
    q.length > 0
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { category: { contains: q, mode: "insensitive" as const } },
            { venueName: { contains: q, mode: "insensitive" as const } },
            { address: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

  // Events query + category count query in parallel
  const [eventsRaw, categoryCounts] = await Promise.all([
    prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        ...dateWhere,
        ...searchWhere,
        ...(category ? { category } : {}),
        ...(region ? { region } : {}),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        startDate: true,
        coverImage: true,
        venueName: true,
        region: true,
        isOnline: true,
        isFeatured: true,
        store: { select: { name: true, slug: true, logoUrl: true } },
        ticketTypes: {
          select: {
            price: true,
            quantity: true,
            quantitySold: true,
            isVisible: true,
          },
        },
      },
      orderBy,
    }),
    // Category counts for hero pills — always count against all published upcoming events
    prisma.event.groupBy({
      by: ["category"],
      where: { status: "PUBLISHED", startDate: { gte: new Date() } },
      _count: { id: true },
    }),
  ]);
  const eventPrice = (event: (typeof eventsRaw)[number]) => {
    const visible = event.ticketTypes.filter((ticket) => ticket.isVisible);
    return visible.length ? Math.min(...visible.map((ticket) => ticket.price)) : 0;
  };
  const events = [...eventsRaw].sort((a,b) => {
    if (sort === "price_asc") return eventPrice(a) - eventPrice(b);
    if (sort === "price_desc") return eventPrice(b) - eventPrice(a);
    if (sort === "name") return a.title.localeCompare(b.title);
    return 0;
  });

  // Build a map: category value → count
  const countByCategory: Record<string, number> = {};
  for (const row of categoryCounts) {
    if (row.category) countByCategory[row.category] = row._count.id;
  }

  const hasFilters = q || category || region || searchParams.date;

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
      />

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundColor: "#1C1C1A",
          backgroundImage:
            "url('https://res.cloudinary.com/dosxxjwnh/image/upload/v1780164845/events-hero_bfhevo.png')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      >
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/75 via-black/65 to-black/85" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-8 pt-20 sm:px-6 sm:pb-14 sm:pt-28">
          {/* Eyebrow pill */}
          <div className="mb-5 flex justify-center">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
              style={{
                background: "rgba(212,69,10,0.15)",
                border: "1px solid rgba(212,69,10,0.3)",
                color: "#D4450A",
              }}
            >
              🎟 Events &amp; Tickets
            </span>
          </div>

          {/* Heading */}
          <div className="mb-5 text-center">
            <h1
              className="font-sans font-extrabold leading-[1.06] tracking-tight text-white"
              style={{ fontSize: "clamp(2.4rem, 5vw, 3.5rem)" }}
            >
              Trinidad &amp; Tobago&apos;s
              <br />
              <em className="not-italic text-[#D4450A]">Biggest Events</em>
            </h1>
          </div>

          {/* Category pill row with scarlet dot separators + counts */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            {HERO_CATEGORIES.filter((pill) => (countByCategory[pill.value] ?? 0) > 0).map(
              (pill, i, arr) => (
                <span key={pill.value} className="flex items-center gap-3">
                  <Link
                    href={`/events?category=${pill.value}`}
                    className={`text-sm transition-colors duration-150 ${
                      category === pill.value
                        ? "font-semibold text-[#D4450A]"
                        : "text-white/50 hover:text-white"
                    }`}
                  >
                    {pill.label}
                    <span className="ml-1.5 text-white/30">
                      ({countByCategory[pill.value] ?? 0})
                    </span>
                  </Link>
                  {i < arr.length - 1 && (
                    <span className="size-1 rounded-full bg-[#D4450A]/60" aria-hidden />
                  )}
                </span>
              ),
            )}
          </div>

          {/* Filters */}
          <Suspense fallback={null}>
            <EventFilters />
          </Suspense>
        </div>
      </section>

      {/* ── Results ── */}
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        {/* Results bar */}
        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="text-sm text-[#888]">
            <span className="font-semibold text-[#1C1C1A]">{events.length}</span>{" "}
            {events.length === 1 ? "event" : "events"} found
          </p>
          {hasFilters && (
            <Link
              href="/events"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 shadow-sm transition-colors hover:border-[#D4450A] hover:text-[#D4450A]"
            >
              Clear filters
            </Link>
          )}
        </div>

        {events.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(events as EventCardData[]).map((event, idx) => {
              const isFeatured = event.isFeatured === true && idx === 0;
              return (
                <div key={event.id} className={isFeatured ? "sm:col-span-2 xl:col-span-2" : ""}>
                  <EventCard event={event} featured={isFeatured} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-5 text-6xl">🎟️</div>
            <h2 className="mb-2 font-sans text-xl font-bold text-[#1C1C1A]">No events found</h2>
            <p className="mb-8 max-w-sm text-sm text-zinc-500">
              {hasFilters
                ? "Try adjusting your filters or clearing the search."
                : "Check back soon — events will appear here as vendors publish them."}
            </p>
            {hasFilters && (
              <Link
                href="/events"
                className="rounded-full bg-[#D4450A] px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Clear all filters
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
