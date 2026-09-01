import type { Prisma } from "@prisma/client";

/**
 * Split-order fields safe when production DB lags local schema.prisma
 * (e.g. earnings_released, completed_at, auto_complete_at, bay_number not migrated).
 *
 * Uses only columns from the initial split_orders table + phase_d pickup_region.
 */
export const vendorSplitOrderListSelect = {
  id: true,
  mainOrderId: true,
  status: true,
  subtotalMinor: true,
  shippingMinor: true,
  currency: true,
  createdAt: true,
  vendorInboundMethod: true,
  pickupRegion: true,
  items: {
    select: {
      id: true,
      titleSnapshot: true,
      quantity: true,
      unitPriceMinor: true,
      lineTotalMinor: true,
      listing: {
        select: { imageUrl: true },
      },
    },
  },
  mainOrder: {
    select: {
      region: true,
      buyer: {
        select: { fullName: true },
      },
    },
  },
} satisfies Prisma.SplitOrderSelect;

/** Shipment fields from phase_d + baseline status (no pickup_fee_minor / total_weight_lbs). */
export const vendorInboundShipmentSelect = {
  id: true,
  status: true,
  region: true,
  claimedAt: true,
  pickedUpAt: true,
  courierId: true,
  courier: {
    select: {
      fullName: true,
      region: true,
      phone: true,
    },
  },
} satisfies Prisma.ShipmentSelect;

/**
 * Order detail — avoids inboundShipment (needs inbound_shipment_id) and unmigrated split columns.
 */
export const vendorSplitOrderDetailSelect = {
  id: true,
  mainOrderId: true,
  storeId: true,
  status: true,
  subtotalMinor: true,
  shippingMinor: true,
  vendorInboundMethod: true,
  store: {
    select: {
      name: true,
      region: true,
      address: true,
      logoUrl: true,
      shippingMode: true,
      subscriptionPlan: true,
      checkoutFields: true,
    },
  },
  items: {
    select: {
      id: true,
      titleSnapshot: true,
      quantity: true,
      unitPriceMinor: true,
      lineTotalMinor: true,
      listing: {
        select: { imageUrl: true },
      },
    },
  },
  mainOrder: {
    select: {
      id: true,
      status: true,
      region: true,
      shippingMinor: true,
      totalMinor: true,
      createdAt: true,
      checkoutResponses: true,
      shippingAddress: {
        select: {
          line1: true,
          line2: true,
          city: true,
          region: true,
          phone: true,
          latitude: true,
          longitude: true,
        },
      },
      buyer: {
        select: { id: true, fullName: true, email: true },
      },
      _count: {
        select: { splitOrders: true },
      },
    },
  },
  legacyInboundShipment: {
    select: vendorInboundShipmentSelect,
  },
} satisfies Prisma.SplitOrderSelect;
