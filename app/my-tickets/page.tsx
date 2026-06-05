import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, MapPin, Ticket } from "lucide-react";

import { getSession } from "@/lib/auth/session";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { prisma } from "@/lib/prisma";
import { icn } from "@/lib/iconography";
import { generateTicketQRCodeDataURL } from "@/lib/tickets/qr-code";
import { ticketPaidMinor } from "@/lib/tickets/ticket-paid-minor";
import PublicNav from "@/components/layout/PublicNav";
import {
  formatEventDateShort,
  formatEventTime,
} from "@/lib/events/format-datetime";

export const metadata: Metadata = {
  title: "My Tickets",
  description: "View and manage your event tickets.",
};

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  VALID: { label: "Valid", bg: "#DCFCE7", text: "#166534" },
  USED: { label: "Used", bg: "#F4F4F5", text: "#71717A" },
  CANCELLED: { label: "Cancelled", bg: "#FEE2E2", text: "#991B1B" },
  REFUNDED: { label: "Refunded", bg: "#FEF3C7", text: "#92400E" },
};

function formatMinor(minor: number): string {
  return `TTD ${(minor / 100).toFixed(2)}`;
}

export default async function MyTicketsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [userRecord, tickets] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.ticket.findMany({
      where: { userId: session.userId },
      include: {
        event: {
          select: {
            title: true,
            slug: true,
            startDate: true,
            venueName: true,
            coverImage: true,
            isOnline: true,
          },
        },
        ticketType: {
          select: {
            name: true,
            color: true,
            price: true,
          },
        },
        ticketOrder: {
          select: {
            reference: true,
            total: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const continueHref = userRecord ? getRoleDashboardPath(userRecord.role) : null;

  const ticketsWithQr = await Promise.all(
    tickets.map(async (ticket) => {
      let qrDataUrl: string | null = null;
      try {
        qrDataUrl = await generateTicketQRCodeDataURL(ticket.qrToken);
      } catch {
        qrDataUrl = null;
      }
      return { ...ticket, qrDataUrl };
    }),
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      <PublicNav
        user={
          userRecord
            ? { name: userRecord.fullName ?? "Account", href: continueHref! }
            : null
        }
        dashboardHref={continueHref ?? undefined}
      />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            My Tickets
          </h1>
          <Link
            href="/events"
            className="text-sm hover:underline"
            style={{ color: "var(--blue)" }}
          >
            Browse events
          </Link>
        </div>

        {tickets.length === 0 ? (
          <div className="py-16 text-center">
            <Ticket
              className={`${icn.empty} mx-auto mb-4`}
              aria-hidden
              strokeWidth={1.25}
            />
            <h2
              className="mb-2 text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              No tickets yet
            </h2>
            <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
              Tickets you purchase for events will appear here
            </p>
            <Link
              href="/events"
              className="inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--scarlet)" }}
            >
              Browse events →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {ticketsWithQr.map((ticket) => {
              const status =
                STATUS_STYLES[ticket.status as string] ?? STATUS_STYLES.VALID;
              const accentColor = ticket.ticketType?.color ?? "#D4450A";

              return (
                <article
                  key={ticket.id}
                  className="overflow-hidden rounded-2xl bg-white"
                  style={{
                    border: "1px solid var(--card-border-subtle)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  {/* Event cover + details — event page link stays separate */}
                  <div className="flex gap-4 p-4 sm:p-5">
                    {/* Cover image */}
                    {ticket.event.coverImage ? (
                      <div className="hidden shrink-0 sm:block">
                        <img
                          src={ticket.event.coverImage}
                          alt={ticket.event.title}
                          className="h-20 w-28 rounded-xl object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="hidden h-20 w-28 shrink-0 items-center justify-center rounded-xl sm:flex"
                        style={{ backgroundColor: accentColor + "1a" }}
                      >
                        <Ticket
                          className="size-7 opacity-40"
                          style={{ color: accentColor }}
                        />
                      </div>
                    )}

                    {/* Event info */}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/events/${ticket.event.slug}`}
                        className="mb-1 block text-[15px] font-semibold leading-snug hover:underline"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {ticket.event.title}
                      </Link>

                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span
                          className="flex items-center gap-1 text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <Calendar className="size-3 shrink-0" strokeWidth={2} />
                          {formatEventDateShort(ticket.event.startDate)}{" "}
                          · {formatEventTime(ticket.event.startDate)}
                        </span>

                        {ticket.event.isOnline ? (
                          <span
                            className="flex items-center gap-1 text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <MapPin className="size-3 shrink-0" strokeWidth={2} />
                            Online event
                          </span>
                        ) : ticket.event.venueName ? (
                          <span
                            className="flex items-center gap-1 text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <MapPin className="size-3 shrink-0" strokeWidth={2} />
                            {ticket.event.venueName}
                          </span>
                        ) : null}
                      </div>

                      {/* Ticket type badge */}
                      <div className="mt-2">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: accentColor + "1a",
                            color: accentColor,
                          }}
                        >
                          <span
                            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: accentColor }}
                          />
                          {ticket.ticketType?.name ?? "General Admission"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/my-tickets/${ticket.id}`}
                    className="block transition-colors hover:bg-zinc-50/80 active:bg-zinc-100"
                  >
                  {/* Ticket meta row */}
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
                    style={{
                      borderTop: "1px solid var(--card-border-subtle)",
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Ticket{" "}
                        <span
                          className="font-mono font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          #{ticket.ticketNumber}
                        </span>
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {ticket.holderName}
                      </span>
                      {ticket.ticketOrder ? (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Order{" "}
                          <span
                            className="font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            #{ticket.ticketOrder.reference}
                          </span>
                        </span>
                      ) : null}
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {ticketPaidMinor(ticket) === 0
                          ? "Free"
                          : formatMinor(ticketPaidMinor(ticket))}
                      </span>
                    </div>

                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: status.bg,
                        color: status.text,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* Step 5b/5c placeholder — QR code + PDF download */}
                  <div
                    className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
                    style={{
                      borderTop: "1px solid var(--card-border-subtle)",
                      backgroundColor: "#FAFAFA",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {ticket.qrDataUrl ? (
                        <img
                          src={ticket.qrDataUrl}
                          alt={`Check-in QR for ticket ${ticket.ticketNumber}`}
                          width={64}
                          height={64}
                          className="h-16 w-16 shrink-0 rounded-lg bg-white"
                        />
                      ) : (
                        <>
                          <div
                            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: "#F4F4F5" }}
                            aria-hidden
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#A1A1AA"
                              strokeWidth="1.5"
                              aria-hidden
                            >
                              <rect x="3" y="3" width="7" height="7" rx="1" />
                              <rect x="14" y="3" width="7" height="7" rx="1" />
                              <rect x="3" y="14" width="7" height="7" rx="1" />
                              <rect x="5" y="5" width="3" height="3" fill="#A1A1AA" stroke="none" />
                              <rect x="16" y="5" width="3" height="3" fill="#A1A1AA" stroke="none" />
                              <rect x="5" y="16" width="3" height="3" fill="#A1A1AA" stroke="none" />
                              <rect x="14" y="14" width="3" height="3" rx="0.5" />
                              <rect x="19" y="14" width="2" height="2" rx="0.5" />
                              <rect x="19" y="18" width="2" height="3" rx="0.5" />
                              <rect x="14" y="19" width="3" height="2" rx="0.5" />
                            </svg>
                          </div>
                          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                            QR unavailable
                          </span>
                        </>
                      )}
                    </div>

                    <span
                      className="rounded-lg px-3 py-1.5 text-xs font-medium"
                      style={{
                        backgroundColor: "#F4F4F5",
                        color: "var(--text-muted)",
                      }}
                    >
                      View ticket →
                    </span>
                  </div>

                  <div
                    className="flex min-h-[44px] items-center justify-center border-t border-[var(--card-border-subtle)] px-4 py-2 text-sm font-semibold text-[#D4450A]"
                    style={{ backgroundColor: "#FEF0EB" }}
                  >
                    View full ticket & QR
                  </div>
                  </Link>

                  <div
                    className="flex justify-end border-t px-4 py-2 sm:px-5"
                    style={{ borderColor: "var(--card-border-subtle)" }}
                  >
                    <a
                      href={`/api/ticket-pdf/${ticket.id}`}
                      className="inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-xs font-medium transition-opacity hover:opacity-80"
                      style={{
                        color: "var(--text-muted)",
                      }}
                    >
                      Download PDF
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <footer
        className="mt-12 py-6 text-center"
        style={{ borderTop: "1px solid var(--card-border-subtle)" }}
      >
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          <a href="/" style={{ color: "var(--scarlet)" }}>
            LinkWe
          </a>{" "}
          — Trinidad & Tobago&apos;s Marketplace
        </p>
      </footer>
    </div>
  );
}
