import { NextRequest, NextResponse } from "next/server";
import React from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";

import { ManifestDocument } from "@/components/orders/ManifestDocument";
import { getSession } from "@/lib/auth/session";
import {
  MAIN_ORDER_ITEMS_WEIGHT_SELECT,
  splitRefLabel,
  type ManifestSplit,
} from "@/lib/orders/manifest-shared";
import { computeSplitWeightLbs } from "@/lib/orders/split-weight";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const ids =
    new URL(request.url).searchParams
      .get("ids")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const generatedAt = new Date().toISOString().slice(0, 10);

  let splits: ManifestSplit[] = [];

  if (ids.length > 0) {
    const rows = await prisma.splitOrder.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        referenceNumber: true,
        shippingMinor: true,
        createdAt: true,
        store: { select: { name: true } },
        items: {
          select: {
            titleSnapshot: true,
            quantity: true,
          },
        },
        mainOrder: {
          select: {
            referenceNumber: true,
            region: true,
            buyer: { select: { fullName: true, email: true } },
            shippingAddress: {
              select: { line1: true, phone: true, latitude: true, longitude: true },
            },
            items: { select: MAIN_ORDER_ITEMS_WEIGHT_SELECT },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    splits = rows.map((s) => {
      const weight = computeSplitWeightLbs(s.items, s.mainOrder.items);
      const addr = s.mainOrder.shippingAddress;
      return {
        ref: splitRefLabel(s.referenceNumber, s.id),
        storeName: s.store.name,
        customerName: s.mainOrder.buyer.fullName,
        customerEmail: s.mainOrder.buyer.email,
        addressLine1: addr?.line1 ?? null,
        phone: addr?.phone ?? null,
        latitude: addr?.latitude ?? null,
        longitude: addr?.longitude ?? null,
        region: s.mainOrder.region,
        itemLines: weight.lines,
        totalWeightLbs: weight.totalLbs,
        shippingMinor: s.shippingMinor,
      };
    });
  }

  const buffer = await renderToBuffer(
    React.createElement(ManifestDocument, {
      splits,
      generatedAt,
    }) as React.ReactElement<DocumentProps>,
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="linkwe-delivery-manifest-${generatedAt}.pdf"`,
    },
  });
}
