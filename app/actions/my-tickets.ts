"use server";

import { randomUUID } from "crypto";

import type { RefundPolicyType, TicketStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { ticketConfirmationEmail } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";
import { getTicketCheckInUrl } from "@/lib/tickets/qr-code";

const HOLDER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type TransferTicketResult =
  | { ok: true; emailNote?: string }
  | { ok: false; reason?: string };

export type CustomerTicketDetail = {
  id: string;
  ticketNumber: string;
  holderName: string;
  holderEmail: string;
  status: TicketStatus;
  checkedInAt: Date | null;
  transferredAt: Date | null;
  transferredToName: string | null;
  qrToken: string;
  pricePaidMinor: number;
  ticketType: {
    name: string;
    color: string | null;
    price: number;
    description: string | null;
    perks: string | null;
  };
  ticketOrder: {
    reference: string;
    total: number;
    subtotal: number;
    createdAt: Date;
  } | null;
  event: {
    title: string;
    slug: string;
    description: string | null;
    startDate: Date;
    endDate: Date | null;
    isOnline: boolean;
    venueName: string | null;
    address: string | null;
    region: string | null;
    coverImage: string | null;
    galleryImages: string[];
    streamUrl: string | null;
    dressCode: string | null;
    ageRestriction: string | null;
    refundPolicy: string | null;
    refundPolicyType: RefundPolicyType;
    organiserName: string | null;
    store: {
      name: string;
      slug: string;
      logoUrl: string | null;
    };
  };
};

export async function getCustomerTicketById(
  ticketId: string,
): Promise<CustomerTicketDetail | null> {
  const session = await getSession();
  if (!session) return null;

  const trimmedId = ticketId?.trim();
  if (!trimmedId) return null;

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: trimmedId,
      userId: session.userId,
    },
    select: {
      id: true,
      ticketNumber: true,
      holderName: true,
      holderEmail: true,
      status: true,
      checkedInAt: true,
      transferredAt: true,
      transferredToName: true,
      qrToken: true,
      pricePaidMinor: true,
      ticketType: {
        select: {
          name: true,
          color: true,
          price: true,
          description: true,
          perks: true,
        },
      },
      ticketOrder: {
        select: {
          reference: true,
          total: true,
          subtotal: true,
          createdAt: true,
        },
      },
      event: {
        select: {
          title: true,
          slug: true,
          description: true,
          startDate: true,
          endDate: true,
          isOnline: true,
          venueName: true,
          address: true,
          region: true,
          coverImage: true,
          galleryImages: true,
          streamUrl: true,
          dressCode: true,
          ageRestriction: true,
          refundPolicy: true,
          refundPolicyType: true,
          organiserName: true,
          store: {
            select: {
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
        },
      },
    },
  });

  if (!ticket) return null;

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    holderName: ticket.holderName,
    holderEmail: ticket.holderEmail,
    status: ticket.status,
    checkedInAt: ticket.checkedInAt,
    transferredAt: ticket.transferredAt,
    transferredToName: ticket.transferredToName,
    qrToken: ticket.qrToken,
    pricePaidMinor: ticket.pricePaidMinor,
    ticketType: {
      name: ticket.ticketType.name,
      color: ticket.ticketType.color,
      price: Number(ticket.ticketType.price),
      description: ticket.ticketType.description,
      perks: ticket.ticketType.perks,
    },
    ticketOrder: ticket.ticketOrder,
    event: {
      title: ticket.event.title,
      slug: ticket.event.slug,
      description: ticket.event.description,
      startDate: ticket.event.startDate,
      endDate: ticket.event.endDate,
      isOnline: ticket.event.isOnline,
      venueName: ticket.event.venueName,
      address: ticket.event.address,
      region: ticket.event.region,
      coverImage: ticket.event.coverImage,
      galleryImages: ticket.event.galleryImages,
      streamUrl: ticket.event.streamUrl,
      dressCode: ticket.event.dressCode,
      ageRestriction: ticket.event.ageRestriction,
      refundPolicy: ticket.event.refundPolicy,
      refundPolicyType: ticket.event.refundPolicyType,
      organiserName: ticket.event.organiserName,
      store: ticket.event.store,
    },
  };
}

export async function transferTicket(
  ticketId: string,
  newHolderName: string,
  newHolderEmail: string,
): Promise<TransferTicketResult> {
  const session = await getSession();
  if (!session) return { ok: false };

  const trimmedId = ticketId?.trim();
  if (!trimmedId) return { ok: false };

  const trimmedName = newHolderName?.trim() ?? "";
  const trimmedEmail = newHolderEmail?.trim().toLowerCase() ?? "";
  if (!trimmedName || !HOLDER_EMAIL_RE.test(trimmedEmail)) {
    return { ok: false, reason: "Enter a valid name and email." };
  }

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: trimmedId,
      userId: session.userId,
    },
    select: {
      id: true,
      status: true,
      ticketNumber: true,
      pricePaidMinor: true,
      ticketOrder: {
        select: { reference: true },
      },
      event: {
        select: { title: true },
      },
    },
  });

  if (!ticket) return { ok: false };

  if (ticket.status !== "VALID") {
    return {
      ok: false,
      reason: "This ticket can't be transferred (already used or no longer valid).",
    };
  }

  const newQrToken = randomUUID();

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      holderName: trimmedName,
      holderEmail: trimmedEmail,
      qrToken: newQrToken,
      transferredAt: new Date(),
      transferredToName: trimmedName,
    },
  });

  let emailNote: string | undefined;
  try {
    const checkInUrl = getTicketCheckInUrl(newQrToken);
    const { subject, html: baseHtml } = ticketConfirmationEmail({
      customerName: trimmedName,
      eventTitle: ticket.event.title,
      orderRef: ticket.ticketOrder?.reference ?? ticket.ticketNumber,
      ticketCount: 1,
      totalTTD: ticket.pricePaidMinor / 100,
      myTicketsUrl: checkInUrl,
    });

    const html = baseHtml
      .replace(
        "your ticket purchase was successful.",
        "a ticket has been transferred to you.",
      )
      .replace("View my tickets", "View your ticket");

    await sendEmail({
      to: trimmedEmail,
      subject: subject.replace("confirmed", "for you"),
      html,
    });
  } catch (err) {
    console.error("[my-tickets] transfer email failed:", err);
    emailNote =
      "Ticket transferred, but we could not send the confirmation email. Share your updated QR from this page.";
  }

  revalidatePath(`/my-tickets/${trimmedId}`);

  return emailNote ? { ok: true, emailNote } : { ok: true };
}
