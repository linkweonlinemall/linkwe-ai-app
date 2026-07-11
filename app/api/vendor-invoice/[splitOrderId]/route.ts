import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import React from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";

import { VendorInvoiceDocument } from "@/components/orders/VendorInvoiceDocument";
import { getSession } from "@/lib/auth/session";
import { generateOrderQRCodeDataURL } from "@/lib/orders/qr-code";
import { prisma } from "@/lib/prisma";
import { resolveVendorPlan } from "@/lib/finance/vendor-plan";

function readPublicImageDataUrl(filename: string): string | null {
  try {
    const filePath = path.join(process.cwd(), "public", filename);
    const buffer = fs.readFileSync(filePath);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

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
          subscriptionPlan: true,
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
  const waveDataUrl = readPublicImageDataUrl("wave.png");
  const plan = resolveVendorPlan(splitOrder.store.subscriptionPlan);

  const buffer = await renderToBuffer(
    React.createElement(VendorInvoiceDocument, {
      splitOrder,
      qrCodeDataUrl,
      waveDataUrl,
      plan,
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
