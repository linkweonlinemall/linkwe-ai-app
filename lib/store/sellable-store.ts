import type { Prisma } from "@prisma/client";
import { IdVerificationStatus, StoreStatus } from "@prisma/client";

/** Minimal store shape for sellability checks on already-loaded rows. */
export type SellableStoreCheck = {
  status: StoreStatus;
  owner: { idVerificationStatus: IdVerificationStatus };
};

export type StoreSellableResult = { ok: true } | { ok: false; error: string };

/**
 * A store is publicly viewable and sellable ONLY when it is ACTIVE and its
 * owner's ID verification status is APPROVED.
 */
export function sellableStoreWhere(): Prisma.StoreWhereInput {
  return {
    status: StoreStatus.ACTIVE,
    owner: { idVerificationStatus: IdVerificationStatus.APPROVED },
  };
}

/** Product query fragment requiring the owning store to be sellable. */
export function productFromSellableStoreWhere(
  base?: Prisma.ProductWhereInput,
): Prisma.ProductWhereInput {
  return {
    ...(base ?? {}),
    store: sellableStoreWhere(),
  };
}

export function isStoreSellable(store: SellableStoreCheck): boolean {
  return (
    store.status === StoreStatus.ACTIVE &&
    store.owner.idVerificationStatus === IdVerificationStatus.APPROVED
  );
}

/** Result-style guard for checkout/cart actions — no throw; mirror { ok, error } pattern. */
export function assertStoreSellable(store: SellableStoreCheck): StoreSellableResult {
  if (isStoreSellable(store)) {
    return { ok: true };
  }
  return { ok: false, error: "This store is not available for purchase." };
}
