"use server";

import type { RefundPolicyType, TicketStatus } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export type CustomerTicketDetail = {
  id: string;
  ticketNumber: string;
  holderName: string;
  holderEmail: string;
  status: TicketStatus;
  checkedInAt: Date | null;
  qrToken: string;
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
      qrToken: true,
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
    qrToken: ticket.qrToken,
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
