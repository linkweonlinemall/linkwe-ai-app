import "server-only";
import { prisma } from "@/lib/prisma";
import { sellableStoreWhere } from "@/lib/store/sellable-store";
import { eventCategoryLabel } from "./categories";
import { eventRegionLabel, getEventOffer, parseEventQuery, selectEvents, type DirectoryEvent, type EventQuery } from "./directory-query";

export async function getEventDirectory(query: EventQuery, now = new Date()) {
  const rows = await prisma.event.findMany({
    where: { status: "PUBLISHED", store: sellableStoreWhere() },
    select: {
      id: true, title: true, slug: true, description: true, category: true, tags: true,
      startDate: true, endDate: true, coverImage: true, venueName: true, address: true,
      region: true, isOnline: true, isFeatured: true, ageRestriction: true, organiserName: true,
      store: { select: { name: true, slug: true, logoUrl: true } },
      ticketTypes: { select: { price: true, quantity: true, quantitySold: true, isVisible: true, saleStartDate: true, saleEnds: true } },
    },
    orderBy: [{ isFeatured: "desc" }, { startDate: "asc" }, { id: "asc" }],
  });
  const preview = false;
  const events: DirectoryEvent[] = rows.map(row => {
    const { ticketTypes, ...event } = row;
    return { ...event, offer: getEventOffer({ ...event, ticketTypes }, now) };
  });
  const categories = new Map<string, number>(), regions = new Set<string>();
  for (const event of events) {
    if (event.category) categories.set(event.category, (categories.get(event.category) ?? 0) + 1);
    if (event.region && !event.isOnline) regions.add(event.region.replaceAll("_", " ").toLowerCase().trim());
  }
  const options = {
    categories: [...categories].map(([value, count]) => ({ value, count, label: eventCategoryLabel(value) })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    regions: [...regions].map(value => ({ value, label: eventRegionLabel(value) })).sort((a, b) => a.label.localeCompare(b.label)),
  };
  const highlight = selectEvents(events.filter(event => !!event.coverImage), parseEventQuery({ date: "upcoming" }), now).events[0] ?? null;
  return { ...selectEvents(events, query, now), highlight, options, inventoryCount: events.length, preview };
}
export type EventDirectoryOptions = Awaited<ReturnType<typeof getEventDirectory>>["options"];
