import type { MainOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getShippingZone } from "@/lib/shipping/trinidad-zoning";
import type { CheckoutPricingTotals } from "@/lib/checkout/pricing";

/** Line payloads persisted on `OrderItem` (snapshots + billable weight). */
export type CreateOrderLineInput = {
  listingId: string;
  storeId: string;
  titleSnapshot: string;
  priceMinor: number;
  quantity: number;
  weightLbs: number;
};

export type CreateMainOrderFromCheckoutInput = {
  buyerId: string;
  /** Region string passed into checkout pricing / zoning (e.g. address `region`). */
  region: string;
  totals: CheckoutPricingTotals;
  lines: CreateOrderLineInput[];
  status?: MainOrderStatus;
};

/**
 * Persists one `MainOrder` and nested `OrderItem` rows from checkout totals + line snapshots.
 * Split orders, shipments, warehouse lines, and ledger rows stay **out of this path** until a later phase.
 * Does not charge payment or clear the cart — call those from the checkout flow later.
 */
export async function createMainOrderFromCheckout(
  input: CreateMainOrderFromCheckoutInput,
): Promise<{ orderId: string }> {
  const { buyerId, region, totals, lines, status } = input;
  if (lines.length === 0) {
    throw new Error("Cannot create an order with no line items.");
  }

  const order = await prisma.$transaction(async (tx) => {
    return tx.mainOrder.create({
      data: {
        buyerId,
        region,
        shippingZone: getShippingZone(region),
        subtotalMinor: totals.subtotalMinor,
        shippingMinor: totals.shippingMinor,
        totalMinor: totals.totalMinor,
        status: status ?? "PENDING_PAYMENT",
        items: {
          create: lines.map((line) => ({
            listingId: line.listingId,
            storeId: line.storeId,
            titleSnapshot: line.titleSnapshot,
            priceMinor: line.priceMinor,
            quantity: line.quantity,
            weightLbs: line.weightLbs,
          })),
        },
      },
      select: { id: true },
    });
  });

  return { orderId: order.id };
}
