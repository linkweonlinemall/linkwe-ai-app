import { ymdInTrinidad } from "@/lib/timezone/trinidad";
import { getBookingScheduledEnd } from "@/lib/finance/booking-schedule";
export type ExperienceView = "all" | "upcoming" | "past" | "closed" | "transferred";
export function bookingBucket(booking: { status: string; bookingDate: Date | string; endTime: string }, now: number) {
  if (booking.status === "CANCELLED") return "closed";
  if (["COMPLETED", "NO_SHOW"].includes(booking.status) || getBookingScheduledEnd(new Date(booking.bookingDate), booking.endTime).getTime() < now) return "past";
  return "upcoming";
}
export function bookingStatus(status: string) {
  const labels: Record<string, { label: string; tone: string }> = {
    PENDING: { label: "Awaiting confirmation", tone: "amber" }, CONFIRMED: { label: "Confirmed", tone: "mint" },
    DEPOSIT_PAID: { label: "Deposit paid", tone: "orange" }, COMPLETED: { label: "Complete", tone: "mint" },
    CANCELLED: { label: "Cancelled", tone: "rose" }, NO_SHOW: { label: "Missed appointment", tone: "neutral" },
  };
  return labels[status] ?? { label: "Booking update", tone: "neutral" };
}
export type TicketStateInput = { status: string; transferredAt: Date | string | null; event: { status: string; startDate: Date | string; endDate: Date | string | null }; ticketOrder?: { status: string } | null };
export function ticketState(ticket: TicketStateInput, now: number) {
  if (ticket.ticketOrder?.status === "REFUNDED" || ticket.status === "REFUNDED") return { bucket: "closed", label: "Refunded", tone: "rose", usable: false } as const;
  if (ticket.event.status === "CANCELLED" || ticket.status === "CANCELLED") return { bucket: "closed", label: ticket.event.status === "CANCELLED" ? "Event cancelled" : "Cancelled", tone: "rose", usable: false } as const;
  if (ticket.transferredAt) return { bucket: "transferred", label: "Transferred", tone: "amber", usable: false } as const;
  if (ticket.status === "USED") return { bucket: "past", label: "Checked in", tone: "mint", usable: false } as const;
  const ended = ticket.event.status === "COMPLETED" || new Date(ticket.event.endDate ?? `${ymdInTrinidad(new Date(ticket.event.startDate))}T23:59:59-04:00`).getTime() < now;
  if (ended) return { bucket: "past", label: "Past event", tone: "neutral", usable: false } as const;
  if (ticket.status !== "VALID" || (ticket.ticketOrder && ticket.ticketOrder.status !== "PAID")) return { bucket: "closed", label: "Unavailable", tone: "neutral", usable: false } as const;
  return { bucket: "upcoming", label: new Date(ticket.event.startDate).getTime() <= now ? "Happening now" : "Ready for good times", tone: "mint", usable: true } as const;
}
export function externalWebUrl(value: string | null | undefined) {
  if (!value) return null;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.toString() : null; } catch { return null; }
}
export function calendarFile({ id, title, start, end, location = "", description = "" }: { id: string; title: string; start: string; end?: string; location?: string; description?: string }) {
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const date = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//LinkWe//Customer plans//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", `UID:${escape(id)}@linkweonlinemall.com`, `DTSTAMP:${date(new Date().toISOString())}`, `DTSTART:${date(start)}`, ...(end ? [`DTEND:${date(end)}`] : []), `SUMMARY:${escape(title)}`, `LOCATION:${escape(location)}`, `DESCRIPTION:${escape(description)}`, "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
}
