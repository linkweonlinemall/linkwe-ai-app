import { NextRequest, NextResponse } from "next/server";
import React from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";

import { InvoiceDocument } from "@/components/orders/InvoiceDocument";
import { getSession } from "@/lib/auth/session";
import { generateOrderQRCodeDataURL } from "@/lib/orders/qr-code";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const order = await prisma.mainOrder.findFirst({
    where: {
      id: orderId,
      ...(session.role !== "ADMIN" ? { buyerId: session.userId } : {}),
    },
    select: {
      id: true,
      createdAt: true,
      region: true,
      totalMinor: true,
      subtotalMinor: true,
      shippingMinor: true,
      buyer: {
        select: { fullName: true, email: true },
      },
      items: {
        select: {
          id: true,
          titleSnapshot: true,
          priceMinor: true,
          quantity: true,
          product: {
            select: {
              name: true,
              images: true,
              store: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const qrCodeDataUrl = await generateOrderQRCodeDataURL(orderId);

  const buffer = await renderToBuffer(
    React.createElement(InvoiceDocument, {
      order,
      qrCodeDataUrl,
    }) as React.ReactElement<DocumentProps>,
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="linkwe-invoice-${orderId.slice(-8)}.pdf"`,
    },
  });
}
