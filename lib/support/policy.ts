export const SUPPORT_CATEGORIES = ["Orders & delivery", "Payments & payouts", "Services & bookings", "Account & verification", "Technical problem", "Other"] as const;
export const SUPPORT_STATUSES = { OPEN: "Open", IN_PROGRESS: "In progress", WAITING_VENDOR: "Your reply needed", RESOLVED: "Resolved" } as const;
export function supportText(value: unknown, max: number) { return typeof value === "string" && value.trim().length <= max ? value.trim() : ""; }
