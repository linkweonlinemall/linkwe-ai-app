import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import {
  CalendarDays,
  Clock,
  MapPin,
  Video,
  Users,
  Heart,
  ShieldCheck,
  Sparkles,
  Tag,
  Info,
  ExternalLink,
  Music,
} from "lucide-react";

import PublicNav from "@/components/layout/PublicNav";
import { TicketPurchaseCard } from "@/components/events/TicketPurchaseCard";
import { EventShareButton } from "@/components/events/EventShareButton";
import { categoryLabel } from "@/components/events/EventCard";
import LineupLightbox from "@/components/events/LineupLightbox";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await prisma.event.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { title: true, description: true, coverImage: true },
  });
  if (!event) return { title: "Event · LinkWe" };
  return {
    title: `${event.title} · LinkWe Events`,
    description: event.description?.replace(/<[^>]+>/g, "").slice(0, 160) ?? undefined,
    openGraph: event.coverImage ? { images: [event.coverImage] } : undefined,
  };
}

function formatFullDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-TT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-TT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Icon wrapper used in quick strip and section headings
function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D4450A]/10 text-[#D4450A]">
      {children}
    </span>
  );
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;

  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;

  const event = await prisma.event.findFirst({
    where: { slug },
    include: {
      store: {
        select: { name: true, slug: true, logoUrl: true, region: true },
      },
      ticketTypes: {
        where: { isVisible: true },
        orderBy: { price: "asc" },
      },
    },
  });

  if (!event || (event.status !== "PUBLISHED" && event.status !== "CANCELLED")) {
    notFound();
  }

  const now = new Date();
  const isPast = new Date(event.startDate) < now;
  const isCancelled = event.status === "CANCELLED";
  const showTickets = !isCancelled && !isPast;

  const catLabel = categoryLabel(event.category);

  // Canonical URL for share button
  const headersList = await headers();
  const host = headersList.get("host") ?? "linkweonlinemall.com";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const shareUrl = `${protocol}://${host}/events/${event.slug}`;

  // Tickets remaining across all visible types
  const ticketsRemaining = event.ticketTypes.reduce(
    (sum, t) => sum + Math.max(0, t.quantity - t.quantitySold),
    0,
  );

  const eventDate = formatFullDate(event.startDate);
  const eventTime = formatTime(event.startDate);

  // Quick strip items — only include if value exists
  const quickStripItems = [
    event.capacity != null
      ? { Icon: Users, label: "Capacity", value: event.capacity.toLocaleString() }
      : null,
    showTickets && event.ticketTypes.length > 0
      ? {
          Icon: Tag,
          label: "Tickets remaining",
          value: ticketsRemaining > 0 ? ticketsRemaining.toLocaleString() : "Sold out",
        }
      : null,
    event.dressCode
      ? { Icon: Sparkles, label: "Dress code", value: event.dressCode }
      : null,
    event.ageRestriction
      ? { Icon: ShieldCheck, label: "Age restriction", value: event.ageRestriction }
      : null,
  ].filter(Boolean) as { Icon: React.ElementType; label: string; value: string }[];

  // Gallery — cap display at 5 (show +X overlay on the 5th)
  const galleryImages = event.galleryImages as string[];
  const displayGallery = galleryImages.slice(0, 5);
  const galleryOverflow = galleryImages.length > 5 ? galleryImages.length - 5 : 0;

  // Lineup
  type PerformerEntry = { name?: string; role?: string; type?: string; imageUrl?: string };
  const lineupPerformers: PerformerEntry[] | null =
    Array.isArray(event.lineup) && (event.lineup as unknown[]).length > 0
      ? (event.lineup as PerformerEntry[])
      : null;


  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
      />

      {/* ── Status banners ── */}
      {isCancelled && (
        <div className="w-full bg-red-600 py-3 text-center text-sm font-medium text-white">
          This event has been cancelled.
        </div>
      )}
      {!isCancelled && isPast && (
        <div className="w-full bg-amber-500 py-3 text-center text-sm font-medium text-white">
          This event has ended.
        </div>
      )}

      {/* ════════════════════════════════════════════
          HERO — 520px full bleed
      ════════════════════════════════════════════ */}
      <div className="relative h-[520px] w-full overflow-hidden bg-[#1C1C1A]">
        {/* Cover image */}
        {event.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImage}
            alt={event.title}
            className="h-full w-full object-cover object-top"
          />
        )}

        {/* Gradient overlay: light at top → heavy at bottom */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-black/20 to-black/85" />

        {/* ── Top bar ── */}
        <div className="absolute left-6 right-6 top-6 flex items-center justify-between">
          {/* Back link */}
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            ← All events
          </Link>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <EventShareButton title={event.title} url={shareUrl} glass />
            <button
              aria-label="Save event"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            >
              <Heart className="size-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Bottom section: category + title + meta ── */}
        <div className="absolute bottom-0 left-0 right-0 p-10">
          {catLabel && (
            <span className="mb-4 inline-block rounded-full bg-[#D4450A] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow">
              {catLabel}
            </span>
          )}
          <h1
            className="mb-5 max-w-2xl font-sans text-5xl font-extrabold leading-tight text-white drop-shadow-md"
            style={{ textShadow: "0 2px 16px rgba(0,0,0,0.35)" }}
          >
            {event.title}
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {/* Date */}
            <span className="flex items-center gap-2 text-sm text-white/85">
              <CalendarDays className="size-4 shrink-0" aria-hidden />
              {eventDate}
            </span>
            <span className="hidden h-4 w-px bg-white/20 sm:block" aria-hidden />
            {/* Time */}
            <span className="flex items-center gap-2 text-sm text-white/85">
              <Clock className="size-4 shrink-0" aria-hidden />
              {eventTime}
            </span>
            {(event.venueName || event.region || event.isOnline) && (
              <>
                <span className="hidden h-4 w-px bg-white/20 sm:block" aria-hidden />
                <span className="flex items-center gap-2 text-sm text-white/85">
                  {event.isOnline ? (
                    <Video className="size-4 shrink-0" aria-hidden />
                  ) : (
                    <MapPin className="size-4 shrink-0" aria-hidden />
                  )}
                  {event.isOnline
                    ? "Online event"
                    : [event.venueName, event.region].filter(Boolean).join(", ")}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          QUICK STRIP
      ════════════════════════════════════════════ */}
      {quickStripItems.length > 0 && (
        <div className="mx-auto max-w-5xl px-6 pt-6">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="grid divide-x divide-zinc-100"
              style={{ gridTemplateColumns: `repeat(${quickStripItems.length}, 1fr)` }}>
              {quickStripItems.map(({ Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 px-5 py-4">
                  <IconBadge>
                    <Icon className="size-4" aria-hidden />
                  </IconBadge>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                      {label}
                    </p>
                    <p className="truncate text-sm font-semibold text-[#1C1C1A]">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          TWO-COLUMN CONTENT
      ════════════════════════════════════════════ */}
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="min-w-0 flex-1 space-y-6">

            {/* About card */}
            {event.description && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-7">
                <div className="mb-5 flex items-center gap-3">
                  <IconBadge>
                    <Info className="size-4" aria-hidden />
                  </IconBadge>
                  <h2 className="font-sans text-base font-bold text-[#1C1C1A]">
                    About this event
                  </h2>
                </div>
                <div
                  className="prose prose-sm max-w-none text-zinc-600 prose-headings:font-sans prose-headings:text-[#1C1C1A] prose-a:text-[#D4450A] prose-strong:text-[#1C1C1A]"
                  dangerouslySetInnerHTML={{ __html: event.description }}
                />
                {/* Attribute badges */}
                {(event.ageRestriction || event.dressCode || event.isOnline) && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {event.ageRestriction && (
                      <span className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-700">
                        🔞 {event.ageRestriction}
                      </span>
                    )}
                    {event.dressCode && (
                      <span className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-700">
                        👔 {event.dressCode}
                      </span>
                    )}
                    {event.isOnline && (
                      <span className="rounded-full border border-[#1A7FB5]/30 px-3 py-1 text-sm text-[#1A7FB5]">
                        🌐 Online · Link provided after purchase
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Lineup card */}
            {lineupPerformers && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-7">
                <div className="mb-5 flex items-center gap-3">
                  <IconBadge>
                    <Music className="size-4" aria-hidden />
                  </IconBadge>
                  <h2 className="font-sans text-base font-bold text-[#1C1C1A]">
                    Entertainment &amp; Lineup
                  </h2>
                </div>
                <LineupLightbox performers={lineupPerformers} />
              </div>
            )}

            {/* Gallery card */}
            {displayGallery.length > 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-7">
                <h2 className="mb-5 font-sans text-base font-bold text-[#1C1C1A]">Photos</h2>

                {displayGallery.length === 1 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayGallery[0]}
                    alt={`${event.title} photo`}
                    className="h-64 w-full rounded-xl object-cover"
                  />
                ) : (
                  <div
                    className="overflow-hidden rounded-xl"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr",
                      gridTemplateRows: "140px 140px",
                      gap: "8px",
                    }}
                  >
                    {displayGallery.map((img, i) => {
                      const isFirst = i === 0;
                      const isLastShown = i === displayGallery.length - 1;
                      const showOverlay = isLastShown && galleryOverflow > 0;

                      return (
                        <div
                          key={i}
                          className="relative overflow-hidden"
                          style={isFirst ? { gridRow: "span 2" } : {}}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img}
                            alt={`${event.title} photo ${i + 1}`}
                            className="h-full w-full object-cover"
                          />
                          {showOverlay && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                              <span className="text-2xl font-bold text-white">
                                +{galleryOverflow}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Hosted by card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-7">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                Hosted by
              </p>
              <div className="flex items-center gap-4">
                {/* Store logo */}
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#D4450A]">
                  {event.store.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.store.logoUrl}
                      alt={event.store.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-white">
                      {event.store.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#1C1C1A]">{event.store.name}</p>
                  {event.store.region && (
                    <p className="mt-0.5 text-sm text-zinc-400">{event.store.region}</p>
                  )}
                </div>
                <Link
                  href={`/store/${event.store.slug}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#D4450A]/8 px-4 py-2 text-sm font-semibold text-[#D4450A] transition-colors hover:bg-[#D4450A]/15"
                >
                  Visit store →
                </Link>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── sticky ticket card */}
          <div className="w-full lg:sticky lg:top-6 lg:w-[360px] lg:shrink-0">
            {showTickets ? (
              <TicketPurchaseCard
                eventId={event.id}
                eventSlug={event.slug}
                startDate={event.startDate}
                ticketTypes={event.ticketTypes.map((t) => ({
                  id: t.id,
                  name: t.name,
                  price: Number(t.price),
                  quantity: t.quantity,
                  quantitySold: t.quantitySold,
                  description: t.description,
                  perks: t.perks,
                  maxPerOrder: t.maxPerOrder,
                  isVisible: t.isVisible,
                  saleStartDate: t.saleStartDate,
                  saleEnds: t.saleEnds,
                }))}
                refundPolicyType={event.refundPolicyType}
                refundCutoffHours={event.refundCutoffHours}
              />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-lg">
                <div className="bg-[#1C1C1A] px-6 py-5">
                  <p className="text-sm text-white/70">{eventDate} · {eventTime}</p>
                  <p className="mt-2 text-base font-bold text-white">
                    {isCancelled ? "Event cancelled" : "Event ended"}
                  </p>
                </div>
                <div className="px-6 py-8 text-center">
                  <div className="mb-4 text-5xl">{isCancelled ? "❌" : "⏰"}</div>
                  <p className="font-semibold text-zinc-700">
                    {isCancelled
                      ? "This event was cancelled"
                      : "This event has ended"}
                  </p>
                  <p className="mt-2 text-sm text-zinc-400">
                    {isCancelled
                      ? "No tickets are available for this event."
                      : "Tickets are no longer available."}
                  </p>
                  <Link
                    href="/events"
                    className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#D4450A]/8 px-5 py-2.5 text-sm font-semibold text-[#D4450A] transition-colors hover:bg-[#D4450A]/15"
                  >
                    Browse upcoming events →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
