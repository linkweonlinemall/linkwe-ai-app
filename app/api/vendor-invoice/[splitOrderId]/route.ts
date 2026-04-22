import { NextRequest, NextResponse } from "next/server";
import React from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";

import { VendorInvoiceDocument } from "@/components/orders/VendorInvoiceDocument";
import { getSession } from "@/lib/auth/session";
import { generateOrderQRCodeDataURL } from "@/lib/orders/qr-code";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ splitOrderId: string }> },
) {
  const { splitOrderId } = await params;

  const session = await getSession();
  if (!session || session.role !== "VENDOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const splitOrder = await prisma.splitOrder.findFirst({
    where: {
      id: splitOrderId,
      store: { ownerId: session.userId },
    },
    include: {
      store: {
        select: {
          name: true,
          slug: true,
          tagline: true,
          logoUrl: true,
          region: true,
          address: true,
          owner: {
            select: {
              fullName: true,
              email: true,
              bankDetails: {
                select: { bankName: true, accountName: true },
              },
            },
          },
        },
      },
      items: {
        select: {
          id: true,
          titleSnapshot: true,
          quantity: true,
          unitPriceMinor: true,
          lineTotalMinor: true,
        },
      },
      mainOrder: {
        select: {
          referenceNumber: true,
          region: true,
          createdAt: true,
          buyer: { select: { fullName: true, email: true } },
        },
      },
    },
  });

  if (!splitOrder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const qrCodeDataUrl = await generateOrderQRCodeDataURL(splitOrder.mainOrderId);

  const buffer = await renderToBuffer(
    React.createElement(VendorInvoiceDocument, {
      splitOrder,
      qrCodeDataUrl,
    }) as React.ReactElement<DocumentProps>,
  );

  const refSlug = splitOrder.referenceNumber ?? splitOrderId.slice(-8).toUpperCase();

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${refSlug}.pdf"`,
    },
  });
}
