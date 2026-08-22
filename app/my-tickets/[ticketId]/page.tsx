import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Clock,
  ExternalLink,
  MapPin,
  Ticket,
  Video,
} from "lucide-react";

import { getCustomerTicketById } from "@/app/actions/my-tickets";
import { TransferTicketPanel } from "@/app/my-tickets/[ticketId]/TransferTicketPanel";
import PublicNav from "@/components/layout/PublicNav";
import { getSession } from "@/lib/auth/session";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import {
  formatEventDateLong,
  formatEventTime,
} from "@/lib/events/format-datetime";
import { generateTicketQRCodeDataURL } from "@/lib/tickets/qr-code";
import { ticketPaidMinor } from "@/lib/tickets/ticket-paid-minor";
import { TRINIDAD_TIMEZONE } from "@/lib/timezone/trinidad";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ ticketId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticketId } = await params;
  const ticket = await getCustomerTicketById(ticketId);
  if (!ticket) return { title: "Ticket not found · LinkWe" };
  return {
    title: `${ticket.event.title} · My Ticket`,
    description: `Ticket ${ticket.ticketNumber} for ${ticket.event.title}`,
  };
}

function formatCheckedInAt(date: Date): string {
  return new Date(date).toLocaleString("en-TT", {
    timeZone: TRINIDAD_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTransferredAt(date: Date): string {
  return formatCheckedInAt(date);
}

function formatMinor(minor: number): string {
  return `TTD ${(minor / 100).toFixed(2)}`;
}

function formatRegion(region: string | null): string | null {
  if (!region) return null;
  return region.replace(/_/g, " ");
}

function refundPolicyLabel(type: string): string {
  switch (type) {
    case "FULL":
      return "Full refund available (per event policy)";
    case "PARTIAL":
      return "Partial refund available (per event policy)";
    case "NONE":
      return "No refunds";
    default:
      return type;
  }
}

function statusDisplay(status: string, checkedInAt: Date | null) {
  switch (status) {
    case "VALID":
      return {
        label: "Valid",
        detail: "Show your QR code at entry",
        className: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
      };
    case "USED":
      return {
        label: "Checked in",
        detail: checkedInAt ? `Checked in ${formatCheckedInAt(checkedInAt)}` : "Already used at entry",
        className: "bg-amber-50 text-amber-900 ring-amber-600/20",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        detail: "This ticket is no longer valid",
        className: "bg-red-50 text-red-800 ring-red-600/20",
      };
    case "REFUNDED":
      return {
        label: "Refunded",
        detail: "This ticket was refunded",
        className: "bg-zinc-100 text-zinc-700 ring-zinc-600/20",
      };
    default:
      return {
        label: status,
        detail: null,
        className: "bg-zinc-100 text-zinc-700",
      };
  }
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}

export default async function MyTicketDetailPage({ params }: Props) {
  const { ticketId } = await params;

  const session = await getSession();
  if (!session) redirect("/login");

  const userRecord = await prisma.user.findUnique({ where: { id: session.userId } });
  const continueHref = userRecord ? getRoleDashboardPath(userRecord.role) : null;

  const ticket = await getCustomerTicketById(ticketId);

  if (!ticket) {
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
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <Ticket className="mx-auto mb-4 size-12 text-zinc-300" strokeWidth={1.25} aria-hidden />
          <h1 className="text-xl font-bold text-[#1C1C1A]">Ticket not found</h1>
          <p className="mt-2 text-sm text-zinc-500">
            This ticket doesn&apos;t exist or isn&apos;t linked to your account.
          </p>
          <Link
            href="/my-tickets"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#D4450A] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Back to My Tickets
          </Link>
        </div>
      </div>
    );
  }

  const isTransferred = ticket.transferredAt != null;

  let qrDataUrl: string | null = null;
  if (!isTransferred) {
    try {
      qrDataUrl = await generateTicketQRCodeDataURL(ticket.qrToken);
    } catch {
      qrDataUrl = null;
    }
  }

  const status = statusDisplay(ticket.status, ticket.checkedInAt);
  const accentColor = ticket.ticketType.color ?? "#D4450A";
  const hostLabel = ticket.event.organiserName ?? ticket.event.store.name;
  const streamUrl = ticket.event.streamUrl?.trim() || null;

  const eventInfoItems = [
    ticket.event.dressCode ? { label: "Dress code", value: ticket.event.dressCode } : null,
    ticket.event.ageRestriction
      ? { label: "Age restriction", value: ticket.event.ageRestriction }
      : null,
    ticket.event.refundPolicy
      ? { label: "Refund policy", value: ticket.event.refundPolicy }
      : ticket.event.refundPolicyType
        ? {
            label: "Refunds",
            value: refundPolicyLabel(ticket.event.refundPolicyType),
          }
        : null,
  ].filter(Boolean) as { label: string; value: string }[];

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

      <div className="mx-auto max-w-lg px-4 py-6 sm:py-8">
        <Link
          href="/my-tickets"
          className="mb-4 inline-block min-h-[44px] py-2 text-sm font-medium text-zinc-500 hover:text-[#D4450A]"
        >
          ← My Tickets
        </Link>

        {/* Event header */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {ticket.event.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ticket.event.coverImage}
              alt={ticket.event.title}
              className="h-40 w-full object-cover sm:h-48"
            />
          ) : (
            <div
              className="flex h-32 items-center justify-center sm:h-40"
              style={{ backgroundColor: accentColor + "18" }}
            >
              <Ticket className="size-10 opacity-40" style={{ color: accentColor }} aria-hidden />
            </div>
          )}
          <div className="p-5">
            <Link
              href={`/events/${ticket.event.slug}`}
              className="text-xl font-bold leading-snug text-[#1C1C1A] hover:text-[#D4450A] hover:underline"
            >
              {ticket.event.title}
            </Link>
            <p className="mt-1 text-sm text-zinc-500">
              {hostLabel}
              {ticket.event.organiserName && ticket.event.store.name !== ticket.event.organiserName
                ? ` · ${ticket.event.store.name}`
                : null}
            </p>
            <Link
              href={`/store/${ticket.event.store.slug}`}
              className="mt-2 inline-block text-xs font-medium text-[#D4450A] hover:underline"
            >
              View store
            </Link>
          </div>
        </div>

        {/* QR + status, or transferred-away state */}
        {isTransferred ? (
          <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
            <span className="mb-4 inline-flex rounded-full bg-[#FEF0EB] px-4 py-2 text-sm font-semibold text-[#D4450A] ring-1 ring-inset ring-[#D4450A]/20">
              Transferred
            </span>
            <p className="text-base leading-relaxed text-[#1C1C1A]">
              You transferred this ticket to{" "}
              <span className="font-semibold">{ticket.transferredToName}</span> on{" "}
              <span className="font-semibold">
                {formatTransferredAt(ticket.transferredAt!)}
              </span>
              . You no longer have access to it.
            </p>
            <p className="mt-3 font-mono text-sm text-zinc-500">#{ticket.ticketNumber}</p>
          </section>
        ) : (
          <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 text-center shadow-sm">
            <span
              className={`mb-4 inline-flex flex-col items-center rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-inset ${status.className}`}
            >
              {status.label}
              {status.detail ? (
                <span className="mt-0.5 text-xs font-normal opacity-90">{status.detail}</span>
              ) : null}
            </span>

            {qrDataUrl ? (
              <div className="mx-auto inline-block rounded-2xl bg-white p-3 shadow-inner ring-1 ring-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={`Entry QR for ticket ${ticket.ticketNumber}`}
                  width={240}
                  height={240}
                  className="mx-auto h-[min(72vw,240px)] w-[min(72vw,240px)]"
                />
              </div>
            ) : (
              <p className="py-8 text-sm text-zinc-500">QR code unavailable — use PDF download below.</p>
            )}

            <p className="mt-4 text-base font-semibold text-[#1C1C1A]">Show this at entry</p>
            <p className="mt-1 font-mono text-sm font-bold text-[#D4450A]">#{ticket.ticketNumber}</p>
          </section>
        )}

        {/* When & where */}
        <div className="mt-4">
          <Section title="When & where">
            <div className="space-y-3 text-sm text-[#1C1C1A]">
              <div className="flex gap-3">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-[#D4450A]" aria-hidden />
                <div>
                  <p className="font-semibold">{formatEventDateLong(ticket.event.startDate)}</p>
                  <p className="flex items-center gap-1.5 text-zinc-600">
                    <Clock className="size-3.5 shrink-0" aria-hidden />
                    {formatEventTime(ticket.event.startDate)}
                    {ticket.event.endDate ? (
                      <>
                        <span className="text-zinc-400"> to </span>
                        {formatEventTime(ticket.event.endDate)}
                      </>
                    ) : null}
                  </p>
                  {ticket.event.endDate ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      Ends {formatEventDateLong(ticket.event.endDate)}
                    </p>
                  ) : null}
                </div>
              </div>

              {ticket.event.isOnline ? (
                <div className="flex gap-3">
                  <Video className="mt-0.5 size-4 shrink-0 text-[#D4450A]" aria-hidden />
                  <div>
                    <p className="font-semibold">Online event</p>
                    {streamUrl ? (
                      <a
                        href={streamUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#D4450A] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                      >
                        Join event
                        <ExternalLink className="size-4" aria-hidden />
                      </a>
                    ) : (
                      <p className="mt-1 text-zinc-500">
                        Join link will be shared by the organiser before the event.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[#D4450A]" aria-hidden />
                  <div>
                    {ticket.event.venueName ? (
                      <p className="font-semibold">{ticket.event.venueName}</p>
                    ) : null}
                    {ticket.event.address ? (
                      <p className="text-zinc-600">{ticket.event.address}</p>
                    ) : null}
                    {ticket.event.region ? (
                      <p className="mt-1 text-zinc-500">{formatRegion(ticket.event.region)}</p>
                    ) : null}
                    {!ticket.event.venueName && !ticket.event.address && !ticket.event.region ? (
                      <p className="text-zinc-500">Venue details to be announced</p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* What's included */}
        <div className="mt-4">
          <Section title="What's included">
            <div
              className="mb-3 inline-flex flex-wrap items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold"
              style={{
                backgroundColor: accentColor + "1a",
                color: accentColor,
              }}
            >
              {ticket.ticketType.name}
              <span className="font-normal text-zinc-600">
                ·{" "}
                {ticketPaidMinor(ticket) === 0
                  ? "Free"
                  : formatMinor(ticketPaidMinor(ticket))}
              </span>
            </div>
            {ticket.ticketType.perks ? (
              <p className="text-base font-medium leading-relaxed text-[#1C1C1A]">
                {ticket.ticketType.perks}
              </p>
            ) : (
              <p className="text-sm text-zinc-500">Standard admission for this ticket type.</p>
            )}
            {ticket.ticketType.description ? (
              <p
                className={`text-sm leading-relaxed text-zinc-600 ${ticket.ticketType.perks ? "mt-3" : "mt-2"}`}
              >
                {ticket.ticketType.description}
              </p>
            ) : null}
          </Section>
        </div>

        {/* Ticket & order */}
        <div className="mt-4">
          <Section title="Your ticket">
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Holder
                </dt>
                <dd className="font-semibold text-[#1C1C1A]">{ticket.holderName}</dd>
                <dd className="text-zinc-500">{ticket.holderEmail}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Ticket number
                </dt>
                <dd className="font-mono font-bold text-[#D4450A]">{ticket.ticketNumber}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Ticket price
                </dt>
                <dd className="font-semibold text-[#1C1C1A]">
                  {ticketPaidMinor(ticket) === 0
                    ? "Free"
                    : formatMinor(ticketPaidMinor(ticket))}
                </dd>
              </div>
              {ticket.ticketOrder ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Order
                  </dt>
                  <dd className="font-semibold text-[#1C1C1A]">
                    #{ticket.ticketOrder.reference}
                  </dd>
                  <dd className="text-zinc-600">
                    Order total {formatMinor(ticket.ticketOrder.total)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Section>
        </div>

        {/* Event info */}
        {eventInfoItems.length > 0 ? (
          <div className="mt-4">
            <Section title="Event info">
              <ul className="space-y-2 text-sm">
                {eventInfoItems.map((item) => (
                  <li key={item.label}>
                    <span className="font-semibold text-[#1C1C1A]">{item.label}: </span>
                    <span className="text-zinc-600">{item.value}</span>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        ) : null}

        {/* About event */}
        {ticket.event.description ? (
          <div className="mt-4">
            <Section title="About this event">
              <div
                className="prose prose-sm max-w-none text-zinc-600 prose-headings:font-sans prose-headings:text-[#1C1C1A] prose-a:text-[#D4450A] prose-strong:text-[#1C1C1A]"
                dangerouslySetInnerHTML={{ __html: ticket.event.description }}
              />
            </Section>
          </div>
        ) : null}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          {!isTransferred ? (
            <>
              <TransferTicketPanel ticketId={ticket.id} status={ticket.status} />
              <a
                href={`/api/ticket-pdf/${ticket.id}`}
                className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#D4450A] px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90"
              >
                Download PDF
              </a>
            </>
          ) : null}
          <Link
            href={`/events/${ticket.event.slug}`}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl border-2 border-[#D4450A] bg-white text-base font-semibold text-[#D4450A] transition-colors hover:bg-[#FEF0EB]"
          >
            View event page
          </Link>
        </div>
      </div>
    </div>
  );
}
