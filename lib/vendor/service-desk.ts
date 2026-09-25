import { getBookingScheduledEnd, getBookingScheduledStart } from "@/lib/finance/booking-schedule";
import { ymdInTrinidad } from "@/lib/timezone/trinidad";

export type DeskKind = "booking" | "request" | "subscription";
export type DeskQueue = "all" | "attention" | "upcoming" | "waiting" | "active" | "history";
type Base = {
  id: string; kind: DeskKind; status: string; createdAt: string;
  customerId: string; customer: { fullName: string | null; email: string; phone: string | null } | null;
  service: { id: string; name: string; slug: string; images: string[] };
};
export type DeskBooking = Base & {
  kind: "booking"; bookingDate: string; startTime: string; endTime: string; guestCount: number;
  totalPrice: number; amountPaid: number | null; customerNotes: string | null; vendorNotes: string | null;
  meetingLink: string | null; cancellationReason: string | null; cancelledBy: string | null;
  cancelledAt: string | null; completedAt: string | null; autoCompleteAt: string | null;
  earningsReleased: boolean; staffName: string | null; location: string | null;
  coupon: string | null;
};
export type DeskRequest = Base & {
  kind: "request"; requestType: string; description: string; photos: string[];
  customerAddress: string | null; customerLat: number | null; customerLng: number | null;
  quotedPrice: number | null; amountPaid: number | null; travelFee: number | null;
  vendorNotes: string | null; declineReason: string | null; estimatedArrival: string | null;
  respondedAt: string | null; completedAt: string | null; vendorCompletedAt: string | null;
  autoCompleteAt: string | null; earningsReleased: boolean; coupon: string | null;
};
export type DeskSubscription = Base & {
  kind: "subscription"; priceMinor: number; interval: string;
  currentPeriodEnd: string | null; nextChargeAt: string | null; lastChargeAt: string | null;
  cancelAtPeriodEnd: boolean; canceledAt: string | null; pausedAt: string | null;
  pauseEndsAt: string | null; trialEndsAt: string | null;
  sessionsIncluded: number | null; sessionsRemaining: number | null;
  cancellationNoticeDays: number; canPause: boolean; pauseMaxWeeks: number | null;
  sessions: { id: string; usedAt: string }[];
};
export type DeskRecord = DeskBooking | DeskRequest | DeskSubscription;
export const deskKey = (row: Pick<DeskRecord, "kind" | "id">) => `${row.kind}:${row.id}`;
export const deskHref = (kind?: DeskKind, id?: string) => `/dashboard/vendor/service-desk${kind ? `?type=${kind}${id ? `&record=${encodeURIComponent(deskKey({ kind, id }))}` : ""}` : ""}`;
export const money = (amount: number) => `TT$${amount.toLocaleString("en-TT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const deskDate = (value: string | null, time = false) => value ? new Date(value).toLocaleString("en-TT", { timeZone: "America/Port_of_Spain", day: "numeric", month: "short", year: "numeric", ...(time ? { hour: "numeric", minute: "2-digit" } : {}) }) : "Not set";
export const kindLabel = (r: DeskRecord) => r.kind === "booking" ? "Booking" : r.kind === "subscription" ? "Subscription" : r.requestType === "QUOTE" ? "Quote request" : "On-demand";
export function bookingTime(row: DeskBooking, end = false) { return (end ? getBookingScheduledEnd(new Date(row.bookingDate), row.endTime) : getBookingScheduledStart(new Date(row.bookingDate), row.startTime)).getTime(); }
export const bookingDay = (row: DeskBooking) => ymdInTrinidad(new Date(row.bookingDate));
export function isClosed(row: DeskRecord) { return ["CANCELLED", "CANCELED", "DECLINED", "COMPLETED", "NO_SHOW"].includes(row.status); }
export function needsAttention(row: DeskRecord, now: number) {
  if (isClosed(row)) return false;
  if (row.kind === "booking") return !row.cancelledAt && ["PENDING", "DEPOSIT_PAID"].includes(row.status);
  if (row.kind === "request") return row.status === "PENDING" || row.status === "REFUND_PENDING";
  return row.status === "PAST_DUE" || (row.status === "ACTIVE" && (row.sessionsRemaining === 0 || Boolean(row.currentPeriodEnd && new Date(row.currentPeriodEnd).getTime() <= now)));
}
export function isWaiting(row: DeskRecord, now: number) {
  if (row.kind === "request") return row.status === "ACCEPTED" || (row.status === "CONFIRMED" && Boolean(row.vendorCompletedAt));
  return row.kind === "booking" && row.status === "CONFIRMED" && bookingTime(row, true) < now;
}
export function matchesQueue(row: DeskRecord, queue: DeskQueue, now: number) {
  if (queue === "all") return true;
  if (queue === "history") return isClosed(row);
  if (queue === "attention") return needsAttention(row, now);
  if (queue === "waiting") return isWaiting(row, now);
  if (queue === "upcoming") return row.kind === "booking" && !isClosed(row) && bookingTime(row, true) >= now;
  if (row.kind === "subscription") return row.status === "ACTIVE" && (!row.currentPeriodEnd || new Date(row.currentPeriodEnd).getTime() > now);
  return !isClosed(row) && !needsAttention(row, now) && !isWaiting(row, now);
}
export function deskStatus(row: DeskRecord, now: number): { label: string; tone: string; next: string } {
  if (row.kind === "booking" && row.cancelledAt && !isClosed(row)) return { label: "Cancellation in progress", tone: "amber", next: "The cancellation is being processed." };
  if (row.kind === "request" && row.status === "CONFIRMED" && row.vendorCompletedAt) return { label: "Awaiting completion check", tone: "amber", next: "Work delivered. Waiting for the customer to confirm." };
  if (row.kind === "subscription" && row.status === "ACTIVE" && row.currentPeriodEnd && new Date(row.currentPeriodEnd).getTime() <= now) return { label: "Period ended", tone: "amber", next: "The subscription needs renewal before another session." };
  if (row.kind === "subscription" && row.status === "ACTIVE" && row.cancelAtPeriodEnd) return { label: "Ending this cycle", tone: "amber", next: "Service access continues until the current period ends." };
  const labels: Record<string, [string, string, string]> = {
    PENDING: ["Needs your response", "orange", row.kind === "booking" ? "Review the details and confirm the appointment." : "Review the brief and send your price."],
    DEPOSIT_PAID: ["Deposit received", "orange", "Confirm the appointment and check the remaining balance."],
    CONFIRMED: ["Confirmed", "mint", row.kind === "booking" ? (isWaiting(row, now) ? "Appointment has ended. Completion is confirmed by the customer or automatic processing." : "You’re booked. Review the customer’s notes before the appointment.") : "Carry out the agreed work, then request completion confirmation."],
    ACCEPTED: ["Offer sent", "amber", "The customer needs to accept your offer and choose payment."],
    ACTIVE: ["Active", "mint", row.kind === "subscription" && row.sessionsRemaining === 0 ? "All included sessions have been used this cycle." : "Record a session after delivering the service."],
    PAUSED: ["Paused", "neutral", "Sessions are paused until the subscription resumes."],
    PAST_DUE: ["Payment overdue", "orange", "Contact the customer about renewing their subscription."],
    REFUND_PENDING: ["Refund processing", "amber", "A refund is in progress. Contact support if it remains unresolved."],
    COMPLETED: ["Completed", "mint", "This work is complete."],
    CANCELLED: ["Cancelled", "neutral", "This record is closed."], CANCELED: ["Cancelled", "neutral", "This subscription has ended."],
    DECLINED: ["Declined / closed", "neutral", "This request is closed."], NO_SHOW: ["No-show", "neutral", "The appointment was marked as missed."],
  };
  const [label, tone, next] = labels[row.status] ?? [row.status.toLowerCase().replaceAll("_", " "), "neutral", "Review the details below."];
  return { label, tone, next };
}
export function canRecordSession(row: DeskSubscription, now: number) { return row.status === "ACTIVE" && (row.sessionsRemaining ?? 0) > 0 && Boolean(row.currentPeriodEnd && new Date(row.currentPeriodEnd).getTime() > now); }
export function monthlyRecurringMinor(rows: DeskRecord[], now: number) {
  return rows.reduce((sum, row) => {
    if (row.kind !== "subscription" || !matchesQueue(row, "active", now)) return sum;
    const factor: Record<string, number> = { weekly: 52 / 12, fortnightly: 26 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
    return sum + Math.round(row.priceMinor * (factor[row.interval] ?? 1));
  }, 0);
}
export function filterDesk(rows: DeskRecord[], options: { kind: string; queue: DeskQueue; query: string; service: string; sort: string; now: number }) {
  const words = options.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter(row => (options.kind === "all" || row.kind === options.kind) && matchesQueue(row, options.queue, options.now) && (!options.service || row.service.id === options.service) && words.every(word => `${row.id} ${row.customer?.fullName ?? ""} ${row.customer?.email ?? ""} ${row.service.name} ${kindLabel(row)} ${deskStatus(row, options.now).label}`.toLowerCase().includes(word)))
    .sort((a, b) => {
      if (options.sort === "priority") { const priority = Number(needsAttention(b, options.now)) - Number(needsAttention(a, options.now)); if (priority) return priority; }
      if (options.sort === "schedule") { const date = (r: DeskRecord) => r.kind === "booking" ? bookingTime(r) : r.kind === "subscription" && r.currentPeriodEnd ? new Date(r.currentPeriodEnd).getTime() : Infinity; const difference = date(a) - date(b); if (difference && !Number.isNaN(difference)) return difference; }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}
