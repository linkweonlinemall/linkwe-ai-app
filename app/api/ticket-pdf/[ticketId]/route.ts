import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import React from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";

import { TicketDocument } from "@/components/tickets/TicketDocument";
import { getSession } from "@/lib/auth/session";
import { generateTicketQRCodeDataURL } from "@/lib/tickets/qr-code";
import { prisma } from "@/lib/prisma";

function readLogoDataUrl(): string | null {
  try {
    const logoPath = path.join(process.cwd(), "public", "linkwe-logo-on-dark.png");
    const buffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const { ticketId } = await params;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      ...(session.role !== "ADMIN" ? { userId: session.userId } : {}),
      ticketOrder: { is: { status: "PAID" } },
    },
    select: {
      id: true,
      ticketNumber: true,
      holderName: true,
      status: true,
      qrToken: true,
      event: {
        select: {
          title: true,
          startDate: true,
          venueName: true,
          isOnline: true,
        },
      },
      ticketType: {
        select: {
          name: true,
          color: true,
        },
      },
      ticketOrder: {
        select: {
          reference: true,
          total: true,
        },
      },
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const qrCodeDataUrl = await generateTicketQRCodeDataURL(ticket.qrToken);
  const logoDataUrl = readLogoDataUrl();

  const buffer = await renderToBuffer(
    React.createElement(TicketDocument, {
      ticket,
      qrCodeDataUrl,
      logoDataUrl,
    }) as React.ReactElement<DocumentProps>,
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ticket-${ticket.ticketNumber}.pdf"`,
    },
  });
}
