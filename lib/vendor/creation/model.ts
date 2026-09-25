export const CREATION_ROOT = "/dashboard/vendor/creation";
export const CREATION_TYPES = ["product", "service", "event", "ticket"] as const;
export type CreationKind = typeof CREATION_TYPES[number];
export type CreationFilter = "all" | CreationKind;
export type CreationItem = {
  id: string; kind: CreationKind; title: string; image: string | null; description: string;
  category: string | null; subtype: string; status: string; published: boolean; archived: boolean;
  price: number | null; stock: number | null; featured: boolean; updatedAt: string;
  visible?: boolean; eventId?: string; eventTitle?: string; date?: string; sold?: number; quantity?: number;
  editHref: string; publicHref: string | null; tips: string[];
};
export type CreationLibraryData = {
  storeName: string; storeLive: boolean; items: CreationItem[];
  plan: string; productLimit: number | null; serviceLimit: number | null;
};
export function isCreationKind(value: unknown): value is CreationKind { return typeof value === "string" && CREATION_TYPES.includes(value as CreationKind); }
export function creationKey(item: Pick<CreationItem, "kind" | "id">) { return `${item.kind}:${item.id}`; }
export function creationEditHref(kind: CreationKind, id: string, eventId?: string) {
  return kind === "ticket" ? `${CREATION_ROOT}/event/${encodeURIComponent(eventId ?? "")}?panel=tickets&ticket=${encodeURIComponent(id)}` : `${CREATION_ROOT}/${kind}/${encodeURIComponent(id)}`;
}
export function filterCreations(items: CreationItem[], type: CreationFilter, query: string, status: string, sort: string) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return items.filter(item => (type === "all" || item.kind === type) && (status === "archived" ? item.archived : !item.archived))
    .filter(item => status === "all" || status === "archived" || (status === "attention" ? item.tips.length > 0 : status === "published" ? item.published : status === "draft" ? ["Draft","Event draft"].includes(item.status) : item.status.toLowerCase() === status))
    .filter(item => words.every(word => `${item.title} ${item.description} ${item.category ?? ""} ${item.subtype} ${item.eventTitle ?? ""}`.toLowerCase().includes(word)))
    .sort((a,b) => sort === "name" ? a.title.localeCompare(b.title) : sort === "price" ? (a.price ?? 0) - (b.price ?? 0) : Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
export function creationMoney(value: number | null) { return value === null ? "View ticket options" : value === 0 ? "Free" : new Intl.NumberFormat("en-TT", {style:"currency",currency:"TTD",currencyDisplay:"code",minimumFractionDigits:2}).format(value); }
export function creationDate(value: string) { return new Intl.DateTimeFormat("en-TT", {timeZone:"America/Port_of_Spain",day:"numeric",month:"short",year:"numeric"}).format(new Date(value)); }
export function ticketDisplayStatus(input: { eventStatus: string; eventPublished: boolean; visible: boolean; end: Date | null; starts: Date | null; sold: number; quantity: number }, now = new Date()) {
  if (input.eventStatus === "CANCELLED") return "Cancelled";
  if (input.eventStatus === "COMPLETED") return "Ended";
  if (!input.visible) return "Hidden";
  if (!input.eventPublished || input.eventStatus !== "PUBLISHED") return "Event draft";
  if (input.end && input.end < now) return "Sales ended";
  if (input.starts && input.starts > now) return "Scheduled";
  if (input.sold >= input.quantity) return "Sold out";
  return "On sale";
}
