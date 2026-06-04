import Link from "next/link";
import { MapPin, Clock } from "lucide-react";

import {
  formatEventCalendarDay,
  formatEventTime,
} from "@/lib/events/format-datetime";

export type EventCardData = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  startDate: Date;
  coverImage: string | null;
  venueName: string | null;
  region: string | null;
  isOnline: boolean;
  isFeatured?: boolean;
  store: {
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  ticketTypes: {
    price: number;
    quantity: number;
    quantitySold: number;
    isVisible: boolean;
  }[];
};

export function categoryLabel(value: string | null): string {
  if (!value) return "";
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getPrice(ticketTypes: EventCardData["ticketTypes"]): {
  label: string;
  kind: "price" | "free" | "soldout";
} {
  const visible = ticketTypes.filter((t) => t.isVisible);
  if (visible.length === 0) return { label: "Free", kind: "free" };
  const allSoldOut = visible.every((t) => t.quantitySold >= t.quantity);
  if (allSoldOut) return { label: "Sold out", kind: "soldout" };
  const min = Math.min(...visible.map((t) => t.price));
  if (min === 0) return { label: "Free", kind: "free" };
  return { label: `From TTD ${min.toFixed(2)}`, kind: "price" };
}

type EventCardProps = {
  event: EventCardData;
  featured?: boolean;
};

export function EventCard({ event, featured = false }: EventCardProps) {
  const { day, month } = formatEventCalendarDay(event.startDate);
  const timeStr = formatEventTime(event.startDate);
  const { label: priceLabel, kind } = getPrice(event.ticketTypes);
  const cat = categoryLabel(event.category);
  const soldOut = kind === "soldout";

  return (
    <Link
      href={`/events/${event.slug}`}
      className={`group flex flex-col overflow-hidden rounded-[20px] border border-black/[0.07] bg-white shadow-sm transition-all duration-200 ${
        soldOut ? "opacity-75" : "hover:-translate-y-1 hover:shadow-xl"
      }`}
    >
      {/* ── Image ── */}
      <div
        className={`relative overflow-hidden bg-zinc-900 ${
          featured ? "aspect-[16/7]" : "aspect-[4/3]"
        }`}
      >
        {event.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImage}
            alt={event.title}
            className={`h-full w-full object-cover transition-transform duration-500 ${
              soldOut ? "" : "group-hover:scale-[1.03]"
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-5xl">
            🎟️
          </div>
        )}

        {/* Bottom gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

        {/* Category badge — top left */}
        {cat && (
          <span className="absolute left-3 top-3 rounded-full bg-[#D4450A] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            {cat}
          </span>
        )}

        {/* Date badge — top right */}
        <div className="absolute right-3 top-3 flex flex-col items-center rounded-xl bg-white px-2.5 py-1.5 shadow-md">
          <span className="text-2xl font-extrabold leading-none text-[#1C1C1A]">{day}</span>
          <span className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-[#D4450A]">
            {month}
          </span>
        </div>

        {/* Featured badge */}
        {featured && (
          <span className="absolute bottom-3 left-3 rounded-full bg-[#E8820C] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow">
            ⭐ Featured
          </span>
        )}

        {/* Sold-out overlay */}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full border-2 border-white px-4 py-1.5 text-sm font-bold text-white">
              Sold out
            </span>
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-1 flex-col p-4 pb-5">
        {/* Title */}
        <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug text-[#1C1C1A]">
          {event.title}
        </h3>

        {/* Venue */}
        <div className="mb-1.5 flex items-center gap-1.5 text-xs text-[#888]">
          <MapPin className="size-3 shrink-0 text-[#D4450A]" strokeWidth={2.5} aria-hidden />
          <span className="line-clamp-1">
            {event.isOnline
              ? "Online event"
              : [event.venueName, event.region].filter(Boolean).join(" · ") || "Venue TBC"}
          </span>
        </div>

        {/* Start time */}
        <div className="mb-2 flex items-center gap-1.5 text-xs text-[#888]">
          <Clock className="size-3 shrink-0 text-[#888]" strokeWidth={2} aria-hidden />
          <span>{timeStr}</span>
        </div>

        {/* Store */}
        <div className="mb-3.5 flex items-center gap-1.5">
          <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#D4450A] ring-1 ring-black/5">
            {event.store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.store.logoUrl}
                alt={event.store.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[8px] font-bold text-white">
                {event.store.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-xs text-[#aaa]">{event.store.name}</span>
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-black/[0.06] pt-3.5">
          {soldOut ? (
            <span className="text-[15px] font-bold text-gray-400 line-through">{priceLabel}</span>
          ) : (
            <span
              className={`text-[15px] font-bold ${
                kind === "free" ? "text-emerald-600" : "text-[#1C1C1A]"
              }`}
            >
              {priceLabel}
            </span>
          )}

          {soldOut ? (
            <span className="text-sm font-semibold text-gray-400">Sold out</span>
          ) : (
            <span className="flex items-center gap-0.5 text-sm font-semibold text-[#D4450A] transition-transform duration-200 group-hover:translate-x-1">
              Get tickets →
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
