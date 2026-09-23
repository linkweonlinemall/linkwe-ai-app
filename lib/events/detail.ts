import type { Event, Prisma } from "@prisma/client";
import { eventPriceLabel } from "./directory-query";
import { formatEventDateLong, formatEventDateShort, formatEventTime } from "./format-datetime";
import { eventRegionLabel } from "./directory-query";

export type EventTicketOption = {
  id: string; name: string; price: number; quantity: number | null; quantitySold: number | null;
  description: string | null; perks: string | null; maxPerOrder: number; isVisible: boolean;
  saleStartDate: Date | null; saleEnds: Date | null; validDays?: Prisma.JsonValue; color?: string | null;
};
export type EventDetailData = Pick<Event,
  "id" | "slug" | "title" | "description" | "category" | "tags" | "organiserName" | "startDate" | "endDate" |
  "isOnline" | "venueName" | "address" | "latitude" | "longitude" | "region" | "capacity" | "dressCode" |
  "ticketPrice" | "ticketUrl" | "refundPolicy" | "registrationRequired" | "registrationDeadline" |
  "ageRestriction" | "status" | "eventType" | "coverImage" | "galleryImages" | "hasSeating" |
  "lineup" | "refundPolicyType" | "refundCutoffHours"
> & {
  store: { name: string; slug: string; logoUrl: string | null; region: string | null };
  ticketTypes: EventTicketOption[];
};
export type EventPerformer = { name?: string; role?: string; type?: string; imageUrl?: string };

export function eventState(event: Pick<EventDetailData, "status" | "startDate" | "endDate">, now = new Date()) {
  if (event.status === "CANCELLED") return "cancelled";
  if (event.startDate > now) return "upcoming";
  return event.endDate && event.endDate > now ? "started" : "ended";
}
export function ticketRemaining(ticket: EventTicketOption) {
  return ticket.quantity === null || ticket.quantitySold === null ? null : Math.max(0, ticket.quantity - ticket.quantitySold);
}
export function ticketStatus(ticket: EventTicketOption, now = new Date()) {
  if (!ticket.isVisible) return "hidden";
  if (ticketRemaining(ticket) === 0) return "sold_out";
  if (ticket.saleStartDate && new Date(ticket.saleStartDate) > now) return "not_started";
  if (ticket.saleEnds && new Date(ticket.saleEnds) < now) return "ended";
  return "on_sale";
}
export function ticketLimit(ticket: EventTicketOption) {
  return Math.max(0, Math.min(ticket.maxPerOrder, ticketRemaining(ticket) ?? ticket.maxPerOrder));
}
export function eventStartingPrice(event: EventDetailData, now = new Date()) {
  const state = eventState(event, now);
  if (state !== "upcoming") return state === "cancelled" ? "Event cancelled" : state === "started" ? "Event has started" : "Event ended";
  const available = event.ticketTypes.filter(ticket => ticketStatus(ticket, now) === "on_sale");
  if (available.length) return eventPriceLabel(available.map(ticket => ticket.price));
  const visible = event.ticketTypes.filter(ticket => ticket.isVisible);
  if (visible.length && visible.every(ticket => ticketStatus(ticket, now) === "sold_out")) return "Sold out";
  if (visible.some(ticket => ticketStatus(ticket, now) === "not_started")) return "On sale soon";
  if (visible.length) return "Ticket sales closed";
  if (safeEventUrl(event.ticketUrl) && event.ticketPrice !== null) return eventPriceLabel([event.ticketPrice]);
  return "See ticket details";
}
export function refundSummary(type: string | null, hours: number) {
  return type === "FULL" ? "Full refund up to " + hours + " hours before the event" : type === "PARTIAL" ? "Partial refund up to " + hours + " hours before the event" : "No refunds";
}
export function safeEventUrl(value: string | null | undefined) {
  if (!value) return null;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}
export function eventLocation(event: Pick<EventDetailData, "isOnline" | "venueName" | "address" | "latitude" | "longitude" | "region">) {
  if (event.isOnline) return null;
  const { latitude, longitude } = event;
  const pinned = typeof latitude === "number" && Number.isFinite(latitude) && Math.abs(latitude) <= 90 && typeof longitude === "number" && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
  const parts = [event.venueName?.trim(), event.address?.trim(), event.region && eventRegionLabel(event.region)].filter(Boolean);
  if (!pinned && !parts.length) return null;
  const destination = pinned ? latitude + "," + longitude : parts.join(", ") + ", Trinidad & Tobago";
  return {
    pinned,
    label: parts.join(" · ") || "Event location",
    directionsHref: "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(destination),
    mapHref: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(destination),
    embedHref: pinned ? "https://www.openstreetmap.org/export/embed.html?bbox=" + [longitude! - .018, latitude! - .012, longitude! + .018, latitude! + .012].join(",") + "&layer=mapnik&marker=" + latitude + "," + longitude : null,
  };
}
export function eventPerformers(value: Prisma.JsonValue): EventPerformer[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is Prisma.JsonObject => !!entry && typeof entry === "object" && !Array.isArray(entry)).map(entry => ({
    name: typeof entry.name === "string" ? entry.name : undefined,
    role: typeof entry.role === "string" ? entry.role : undefined,
    type: typeof entry.type === "string" ? entry.type : undefined,
    imageUrl: typeof entry.imageUrl === "string" ? safeEventUrl(entry.imageUrl) ?? undefined : undefined,
  })).filter(entry => entry.name || entry.imageUrl);
}
export function validTicketDays(value: Prisma.JsonValue | undefined) {
  if (!Array.isArray(value)) return [];
  return value.filter((day): day is string => typeof day === "string" && !!day.trim()).map(day => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day + "T12:00:00-04:00"))) return formatEventDateShort(new Date(day + "T12:00:00-04:00"));
    return day;
  });
}
export function eventFacts(event: EventDetailData) {
  const facts: [string, string][] = [["Starts", formatEventDateLong(event.startDate) + " · " + formatEventTime(event.startDate) + " AST"]];
  if (event.endDate) facts.push(["Ends", formatEventDateLong(event.endDate) + " · " + formatEventTime(event.endDate) + " AST"]);
  facts.push(["Experience", event.isOnline ? "Online event" : "In-person event"]);
  if (event.eventType === "MULTI") facts.push(["Schedule", "Multi-day event"]);
  if (event.capacity !== null) facts.push(["Capacity", event.capacity.toLocaleString("en-TT") + " people"]);
  if (event.ageRestriction) facts.push(["Age requirement", event.ageRestriction]);
  if (event.dressCode) facts.push(["Dress code", event.dressCode]);
  if (event.hasSeating) facts.push(["Seating", "Seating available · check your ticket inclusions"]);
  if (event.registrationRequired) facts.push(["Registration", "Registration required"]);
  if (event.registrationDeadline) facts.push(["Registration deadline", formatEventDateLong(event.registrationDeadline) + " · " + formatEventTime(event.registrationDeadline) + " AST"]);
  if (event.organiserName) facts.push(["Organiser", event.organiserName]);
  return facts;
}

export type DisplayPromo = { code: string; discountType: string; discountValue: number };
export function ticketSummary(tickets: EventTicketOption[], quantities: Record<string, number>, promo: DisplayPromo | null, now = new Date()) {
  const items = tickets.filter(ticket => ticketStatus(ticket, now) === "on_sale").map(ticket => ({
    id: ticket.id, name: ticket.name, qty: Math.max(0, Math.min(ticketLimit(ticket), Math.floor(quantities[ticket.id] || 0))), price: Math.round(ticket.price * 100) / 100,
  })).filter(item => item.qty > 0);
  const subtotalMinor = items.reduce((sum, item) => sum + item.qty * Math.round(item.price * 100), 0);
  const discount = promo ? promo.discountType === "PERCENT" ? Math.round(subtotalMinor * promo.discountValue / 100) : promo.discountValue : 0;
  const discountMinor = Math.min(subtotalMinor, Math.max(0, discount));
  return { items, totalTickets: items.reduce((sum, item) => sum + item.qty, 0), subtotalMinor, discountMinor, totalMinor: subtotalMinor - discountMinor };
}

/** Download only; adding it to a calendar remains the visitor's choice. */
export function eventCalendar(event: Pick<EventDetailData, "slug" | "title" | "startDate" | "endDate" | "isOnline" | "venueName" | "address" | "region">) {
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const timestamp = (value: Date) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//LinkWe//Events//EN", "BEGIN:VEVENT", "UID:" + escape(event.slug) + "@linkweonlinemall.com", "DTSTAMP:" + timestamp(new Date()), "DTSTART:" + timestamp(event.startDate)];
  if (event.endDate) lines.push("DTEND:" + timestamp(event.endDate));
  lines.push("SUMMARY:" + escape(event.title), "LOCATION:" + escape(event.isOnline ? "Online event" : [event.venueName, event.address, event.region && eventRegionLabel(event.region)].filter(Boolean).join(", ")), "URL:https://www.linkweonlinemall.com/events/" + encodeURIComponent(event.slug), "END:VEVENT", "END:VCALENDAR");
  // Fold by UTF-8 bytes for calendar applications, retaining whole Unicode characters.
  return lines.map(line => { let result = "", length = 0; for (const char of line) { const bytes = new TextEncoder().encode(char).length; if (length + bytes > 74) { result += "\r\n "; length = 1; } result += char; length += bytes; } return result; }).join("\r\n") + "\r\n";
}
