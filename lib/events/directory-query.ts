import type { Event, EventTicketType } from "@prisma/client";
import { calendarDateAnchorTrinidad, dayOfWeekTrinidad, dayRangeTrinidad, ymdInTrinidad } from "@/lib/timezone/trinidad";
import { eventCategoryLabel } from "./categories";

export const EVENT_PAGE_SIZE = 18;
export const EVENT_DATES = [
  { value: "", label: "All dates" },
  { value: "upcoming", label: "Upcoming" },
  { value: "today", label: "Today" },
  { value: "this_weekend", label: "This weekend" },
  { value: "this_week", label: "Next 7 days" },
  { value: "this_month", label: "This month" },
  { value: "past", label: "Past events" },
];
export const EVENT_SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "soonest", label: "Soonest first" },
  { value: "latest", label: "Latest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
];
export type EventParams = Record<string, string | string[] | undefined>;
export type EventTicket = Pick<EventTicketType, "price" | "quantity" | "quantitySold" | "isVisible" | "saleStartDate" | "saleEnds">;
export type EventRecord = Pick<Event, "id" | "title" | "slug" | "description" | "category" | "tags" | "startDate" | "endDate" | "coverImage" | "venueName" | "address" | "region" | "isOnline" | "isFeatured" | "ageRestriction" | "organiserName"> & {
  store: { name: string; slug: string; logoUrl: string | null };
  ticketTypes: EventTicket[];
};
export type EventOffer = {
  state: "on_sale" | "sold_out" | "not_started" | "closed" | "unannounced" | "past" | "started" | "preview";
  price: number | null;
  hasFree: boolean;
  hasPaid: boolean;
  label: string;
  note: string;
};
export type DirectoryEvent = Omit<EventRecord, "ticketTypes"> & { offer: EventOffer; preview?: boolean };

export function eventPriceLabel(prices: number[]) {
  if (!prices.length) return "See ticket details";
  const min = Math.min(...prices), max = Math.max(...prices);
  if (min === 0) return max > 0 ? "Free tickets available" : "Free entry";
  const amount = new Intl.NumberFormat("en-TT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(min);
  return (min !== max ? "From " : "") + "TTD " + amount;
}

/** Match purchase availability: hidden, exhausted and closed tiers cannot set the advertised price. */
export function getEventOffer(event: Pick<EventRecord, "ticketTypes" | "startDate" | "endDate">, now = new Date()): EventOffer {
  const empty = { price: null, hasFree: false, hasPaid: false };
  if (event.startDate <= now) {
    const ongoing = !!event.endDate && event.endDate > now;
    return { ...empty, state: ongoing ? "started" : "past", label: ongoing ? "Event has started" : "Past event", note: "Explore the event details" };
  }
  const visible = event.ticketTypes.filter(ticket => ticket.isVisible);
  if (!visible.length) return { ...empty, state: "unannounced", label: "See ticket details", note: "Tickets not announced" };
  const remaining = visible.filter(ticket => ticket.quantity > ticket.quantitySold);
  if (!remaining.length) return { ...empty, state: "sold_out", label: "Sold out", note: "Explore the event details" };
  const available = remaining.filter(ticket => (!ticket.saleStartDate || ticket.saleStartDate <= now) && (!ticket.saleEnds || ticket.saleEnds >= now));
  if (!available.length) {
    const future = remaining.some(ticket => ticket.saleStartDate && ticket.saleStartDate > now && (!ticket.saleEnds || ticket.saleEnds >= ticket.saleStartDate));
    return { ...empty, state: future ? "not_started" : "closed", label: future ? "On sale soon" : "Ticket sales closed", note: "Explore the event details" };
  }
  const prices = available.map(ticket => ticket.price);
  return { state: "on_sale", price: Math.min(...prices), hasFree: prices.includes(0), hasPaid: prices.some(price => price > 0), label: eventPriceLabel(prices), note: "Available ticket price · TTD" };
}

export function parseEventQuery(params: EventParams) {
  const text = (key: string) => (Array.isArray(params[key]) ? params[key][0] : params[key])?.trim() ?? "";
  const choice = (key: string, values: string[]) => values.includes(text(key)) ? text(key) : "";
  return {
    q: text("q"), category: text("category") === "all" ? "" : text("category"), region: text("region") === "all" ? "" : normalizedRegion(text("region")),
    date: choice("date", EVENT_DATES.map(date => date.value)),
    format: choice("format", ["online", "in_person"]), pricing: choice("pricing", ["free", "paid"]),
    sort: choice("sort", EVENT_SORTS.map(sort => sort.value)) || "recommended",
    page: Math.min(100000, Math.max(1, Math.floor(Number(text("page"))) || 1)),
  };
}
export type EventQuery = ReturnType<typeof parseEventQuery>;
export function eventsHref(params: EventParams, changes: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) { const first = Array.isArray(value) ? value[0] : value; if (first) query.set(key, first); }
  for (const [key, value] of Object.entries(changes)) { if (value) query.set(key, value); else query.delete(key); }
  return "/events" + (query.size ? "?" + query : "") + "#event-results";
}
export function eventHref(event: DirectoryEvent) {
  if (event.preview && event.slug === "aloha-mimosas-breakfast-party-experience") return "/preview/event/" + event.slug;
  return (event.preview ? "https://www.linkweonlinemall.com" : "") + "/events/" + event.slug;
}
export function eventRegionLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase()).replace(/\bOf\b/g, "of");
}
const normalizedRegion = (value: string) => value.replaceAll("_", " ").trim().toLowerCase();
function shiftedDay(day: string, offset: number) {
  const date = calendarDateAnchorTrinidad(day);
  date.setUTCDate(date.getUTCDate() + offset);
  return ymdInTrinidad(date);
}
export function eventDateRange(value: string, now = new Date()): { start?: Date; end?: Date } {
  const today = ymdInTrinidad(now), range = dayRangeTrinidad(today);
  if (value === "today") return range;
  if (value === "upcoming") return { start: now };
  if (value === "past") return { end: now };
  if (value === "this_week") return { start: now, end: dayRangeTrinidad(shiftedDay(today, 6)).end };
  if (value === "this_month") {
    const last = calendarDateAnchorTrinidad(today);
    last.setUTCMonth(last.getUTCMonth() + 1, 0);
    return { start: now, end: dayRangeTrinidad(ymdInTrinidad(last)).end };
  }
  if (value === "this_weekend") {
    const weekday = dayOfWeekTrinidad(today);
    // On Sunday, the current weekend is still in progress.
    const saturday = shiftedDay(today, weekday === 0 ? -1 : 6 - weekday);
    return { start: new Date(Math.max(now.getTime(), dayRangeTrinidad(saturday).start.getTime())), end: dayRangeTrinidad(shiftedDay(saturday, 1)).end };
  }
  return {};
}
export function selectEvents(events: DirectoryEvent[], query: EventQuery, now = new Date()) {
  const range = eventDateRange(query.date, now);
  const filtered = events.filter(event => {
    const searchable = [event.title, event.store.name, event.organiserName, eventCategoryLabel(event.category), event.venueName, event.address, eventRegionLabel(event.region ?? ""), event.description, ...event.tags].filter(Boolean).join(" ");
    if (query.q && !searchable.toLowerCase().includes(query.q.toLowerCase())) return false;
    if (query.category && event.category !== query.category) return false;
    if (query.region && normalizedRegion(event.region ?? "") !== normalizedRegion(query.region)) return false;
    if (query.date === "past" && event.endDate && event.endDate > now) return false;
    if (range.start && event.startDate < range.start || range.end && event.startDate > range.end) return false;
    if (query.format === "online" && !event.isOnline || query.format === "in_person" && event.isOnline) return false;
    if (query.pricing === "free" && !event.offer.hasFree || query.pricing === "paid" && !event.offer.hasPaid) return false;
    return true;
  }).sort((a, b) => {
    let diff = 0;
    if (query.sort === "price_asc" || query.sort === "price_desc") {
      if (a.offer.price === null && b.offer.price !== null) return 1;
      if (b.offer.price === null && a.offer.price !== null) return -1;
      diff = ((a.offer.price ?? 0) - (b.offer.price ?? 0)) * (query.sort === "price_asc" ? 1 : -1);
    } else if (query.sort === "name") diff = a.title.localeCompare(b.title);
    else if (query.sort === "latest") diff = b.startDate.getTime() - a.startDate.getTime();
    else if (query.sort === "soonest") diff = a.startDate.getTime() - b.startDate.getTime();
    else diff = Number(a.startDate < now) - Number(b.startDate < now) || Number(b.isFeatured) - Number(a.isFeatured) || a.startDate.getTime() - b.startDate.getTime();
    return diff || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
  const total = filtered.length, pages = Math.max(1, Math.ceil(total / EVENT_PAGE_SIZE)), page = Math.min(query.page, pages);
  return { events: filtered.slice((page - 1) * EVENT_PAGE_SIZE, page * EVENT_PAGE_SIZE), total, pages, page };
}
