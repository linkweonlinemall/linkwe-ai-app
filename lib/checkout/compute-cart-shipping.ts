import type { CheckoutPricingLine } from "@/lib/checkout/pricing";
import { getCartSubtotal } from "@/lib/checkout/pricing";
import { prisma } from "@/lib/prisma";
import { loadStoreShippingConfigs } from "@/lib/shipping/load-store-shipping-configs";
import { computePerStoreShipping } from "@/lib/shipping/per-store-shipping";
import { getSelfDeliveryZone } from "@/lib/shipping/self-delivery-zones";
import { getShippingZone } from "@/lib/shipping/trinidad-zoning";

export type CheckoutCartItem = Awaited<ReturnType<typeof loadCheckoutCart>>[number];

export type CheckoutShippingBreakdown = {
  perStore: Array<{
    storeId: string;
    storeName: string;
    mode: "SELF" | "LINKWE";
    shippingMinor: number;
    deliversToZone: boolean;
  }>;
  totalShippingMinor: number;
  hasCoverageFailure: boolean;
  blockedStores: Array<{ storeId: string; storeName: string }>;
};

export type ComputeCartShippingSuccess = CheckoutShippingBreakdown & {
  ok: true;
  zone: string;
  subtotalMinor: number;
  pricingLines: CheckoutPricingLine[];
  cartItems: CheckoutCartItem[];
  storeIds: string[];
};

export type ComputeCartShippingResult =
  | ComputeCartShippingSuccess
  | { ok: false; error: string };

function itemWeightLbs(weight: number | null, weightUnit: string | null): number {
  if (!weight) return 0.5;
  return weightUnit === "KG" ? weight * 2.20462 : weight;
}

/** Order-level shippingZone for MainOrder (metadata; split pricing re-resolves per store from region). */
function resolveOrderShippingZone(
  region: string,
  stores: Array<{ shippingMode: "SELF" | "LINKWE"; allItemsDigitalOrPickup: boolean }>,
): string {
  const deliverable = stores.filter((s) => !s.allItemsDigitalOrPickup);
  if (deliverable.length > 0 && deliverable.every((s) => s.shippingMode === "SELF")) {
    return getSelfDeliveryZone(region);
  }
  return getShippingZone(region);
}

const checkoutCartInclude = {
  product: {
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      isPublished: true,
      deliveryFee: true,
      allowDelivery: true,
      allowPickup: true,
      storeId: true,
      weight: true,
      weightUnit: true,
      isDigital: true,
      store: {
        select: {
          id: true,
          name: true,
          status: true,
          owner: { select: { idVerificationStatus: true } },
        },
      },
    },
  },
} as const;

/** Loads the signed-in user's product cart rows for checkout/shipping. */
export async function loadCheckoutCart(userId: string) {
  return prisma.productCartItem.findMany({
    where: { userId },
    include: checkoutCartInclude,
  });
}

/** Shipping breakdown from already-loaded cart rows (shared by checkout + breakdown). */
export async function computeCartShippingFromItems(
  cartItems: CheckoutCartItem[],
  deliveryRegion: string,
  useDelivery: boolean,
): Promise<Omit<ComputeCartShippingSuccess, "ok">> {
  const pricingLines: CheckoutPricingLine[] = cartItems.map((item) => ({
    priceMinor: Math.round(item.product.price * 100),
    quantity: item.quantity,
    weightLbs: itemWeightLbs(item.product.weight, item.product.weightUnit),
  }));

  const subtotalMinor = getCartSubtotal(pricingLines);
  const storeIds = [...new Set(cartItems.map((i) => i.product.storeId))];
  const configs = await loadStoreShippingConfigs(storeIds);
  const configByStoreId = new Map(configs.map((c) => [c.storeId, c]));

  const itemsByStore = new Map<string, CheckoutCartItem[]>();
  for (const item of cartItems) {
    const sid = item.product.storeId;
    if (!itemsByStore.has(sid)) itemsByStore.set(sid, []);
    itemsByStore.get(sid)!.push(item);
  }

  const storeInputs = storeIds.map((storeId) => {
    const storeItems = itemsByStore.get(storeId) ?? [];
    const config = configByStoreId.get(storeId);
    const storeName =
      config?.storeName ?? storeItems[0]?.product.store.name ?? "Store";
    const totalWeightLbs = storeItems.reduce((sum, item) => {
      if (item.product.isDigital) return sum;
      const w = itemWeightLbs(item.product.weight, item.product.weightUnit);
      return sum + w * item.quantity;
    }, 0);
    const allItemsDigitalOrPickup =
      !useDelivery || storeItems.every((item) => item.product.isDigital);

    return {
      storeId,
      storeName,
      shippingMode: config?.shippingMode ?? "LINKWE",
      selfRates: config?.selfRates ?? [],
      totalWeightLbs,
      allItemsDigitalOrPickup,
    };
  });

  const shippingResult = computePerStoreShipping({
    region: deliveryRegion,
    stores: storeInputs,
  });

  const orderShippingZone = resolveOrderShippingZone(deliveryRegion, storeInputs);

  return {
    perStore: shippingResult.perStore,
    totalShippingMinor: shippingResult.totalShippingMinor,
    hasCoverageFailure: shippingResult.hasCoverageFailure,
    blockedStores: shippingResult.blockedStores,
    zone: orderShippingZone,
    subtotalMinor,
    pricingLines,
    cartItems,
    storeIds,
  };
}

/**
 * Loads cart + computes per-store shipping for checkout (single code path for server + client preview).
 */
export async function computeCartShipping(
  userId: string,
  deliveryRegion: string,
  useDelivery: boolean,
): Promise<ComputeCartShippingResult> {
  const cartItems = await loadCheckoutCart(userId);
  if (cartItems.length === 0) {
    return { ok: false, error: "cart_empty" };
  }

  const result = await computeCartShippingFromItems(cartItems, deliveryRegion, useDelivery);
  return { ok: true, ...result };
}

export function formatCoverageBlockError(
  blockedStores: Array<{ storeId: string; storeName: string }>,
): string {
  const lines = blockedStores.map(
    (s) => `\`${s.storeName}\` doesn't deliver to your area.`,
  );
  return `${lines.join(" ")} Remove their items or choose a different delivery address.`;
}
