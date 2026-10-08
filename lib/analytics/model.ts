export const ANALYTICS_TIMEZONE = "America/Port_of_Spain";
export const RETENTION_DAYS = 180;
export const EVENT_NAMES = ["page_view", "view_item", "view_store", "add_to_cart", "remove_from_cart", "begin_checkout", "payment_redirect", "checkout_error", "search", "contact_click", "sign_up", "vendor_onboarding_complete", "product_published", "web_vital", "booking_unavailable", "save_item"] as const;
export type EventName = typeof EVENT_NAMES[number];
export type AnalyticsFilters = { days: 1 | 7 | 30 | 90; device: "all" | "mobile" | "desktop" | "tablet"; source: string };
export const DEFAULT_FILTERS: AnalyticsFilters = { days: 30, device: "all", source: "all" };
export function parseFilters(input: unknown): AnalyticsFilters {
  const raw = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const days = Number(raw.days ?? 30);
  const device = String(raw.device ?? "all");
  const source = String(raw.source ?? "all");
  if (![1, 7, 30, 90].includes(days) || !["all", "mobile", "desktop", "tablet"].includes(device) || (source !== "all" && safeLabel(source) !== source)) throw new Error("Choose a valid date range, device and traffic source.");
  return { days: days as AnalyticsFilters["days"], device: device as AnalyticsFilters["device"], source };
}
export function analyticsPeriod(days: number, now = new Date()) {
  // Trinidad and Tobago uses UTC−4 all year. Compare equal elapsed periods,
  // including today's partial day, rather than a partial month against a full month.
  const local = new Date(now.getTime() - 4 * 3600_000);
  const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - days + 1, 4));
  return { start, end: now, previousStart: new Date(start.getTime() - (now.getTime() - start.getTime())) };
}
export function safeLabel(value: unknown, max = 80): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().slice(0, max);
  // Only categorical labels and short search terms. Never accept URLs, emails,
  // telephone numbers, markup, or long identifiers from free text.
  if (!text || /[@<>:/\\=]|\d{5,}|(?:\d[\s()+.-]*){7,}/.test(text)) return null;
  return /^[\p{L}\p{N} _.,'&()-]+$/u.test(text) ? text : null;
}
export function safePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.split(/[?#]/)[0];
  if (/^\/order-confirmation\/[a-zA-Z0-9_-]+$/.test(path)) return "/checkout/complete";
  if (path.length > 220 || !/^\/[a-zA-Z0-9/_-]*$/.test(path)) return null;
  if (path === "/") return path;
  if (/^\/(shop|stores|services|events|search|cart|checkout|login|register|start-business|pricing|features|get-app|about|faq|terms|privacy|cookies|contact|timeline|shipping-info|returns)$/.test(path)) return path;
  if (/^\/(store|product|products|service|events|real-estate|vehicles|places|restaurants|accommodations)\/[a-zA-Z0-9_-]+$/.test(path)) return path;
  if (!["/checkout/complete", "/register/business"].includes(path)) return null;
  return path;
}
export type CleanEvent = { occurredAt: number; id: string; name: EventName; path: string; entityId: string | null; label: string | null; value: number | null };
export function cleanEvent(input: unknown): CleanEvent | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const path = safePath(row.path);
  if (!path || typeof row.id !== "string" || !/^[a-f\d-]{36}$/i.test(row.id) || !EVENT_NAMES.includes(row.name as EventName)) return null;
  const occurredAt = typeof row.occurredAt === "number" && row.occurredAt <= Date.now() && row.occurredAt >= Date.now() - 300_000 ? row.occurredAt : Date.now();
  return { occurredAt, id: row.id, name: row.name as EventName, path,
    entityId: typeof row.entityId === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(row.entityId) ? row.entityId : null,
    label: safeLabel(row.label), value: typeof row.value === "number" && Number.isFinite(row.value) && row.value >= 0 && row.value <= 1e9 ? row.value : null };
}
export function percentChange(current: number, previous: number): number | null { return previous > 0 ? (current - previous) / previous * 100 : null; }
export function campaignUrl(origin: string, input: { path: string; source: string; medium: string; campaign: string }) {
  const path = safePath(input.path);
  if (!path || path.startsWith("//") || path !== input.path) throw new Error("Use a public LinkWe path without query parameters, such as /shop or /store/my-store.");
  const source = safeLabel(input.source), medium = safeLabel(input.medium), campaign = safeLabel(input.campaign);
  if (!source || !medium || !campaign) throw new Error("Enter a source, medium and campaign using simple names, without personal details.");
  const url = new URL(path, origin);
  url.searchParams.set("utm_source", source.toLowerCase().replaceAll(" ", "_"));
  url.searchParams.set("utm_medium", medium.toLowerCase().replaceAll(" ", "_"));
  url.searchParams.set("utm_campaign", campaign.toLowerCase().replaceAll(" ", "_"));
  return url.toString();
}
export function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${(/^[=+\-@\t\r]/.test(text) ? "'" : "") + text.replaceAll('"', '""')}"`;
}
