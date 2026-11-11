import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { CatalogueError, parseCatalogueChanges } from "./model";

/** Patch only explicit selections. Drafts remain drafts; unrelated listing fields are never written. */
export async function saveCatalogueSelection(db: PrismaClient, actorId: string, value: unknown) {
  const input = parseCatalogueChanges(value);
  return db.$transaction(async tx => {
    const store = await tx.store.findUnique({ where: { ownerId: actorId }, select: { id: true, slug: true } });
    if (!store || store.id !== input.storeId) throw new CatalogueError("Sign in to the store that opened this catalogue.");
    const products = await tx.product.findMany({
      where: { storeId: store.id, id: { in: input.changes.map(change => change.id) }, isArchived: false },
      select: { id: true, isFeatured: true },
    });
    if (products.length !== input.changes.length)
      throw new CatalogueError("A listing is no longer available in your store. Reload and review your selection.");
    for (const change of input.changes) {
      const result = await tx.product.updateMany({
        where: { id: change.id, storeId: store.id, isArchived: false, isFeatured: change.expected },
        data: { isFeatured: change.selected },
      });
      if (result.count !== 1) throw new CatalogueError("A selection changed elsewhere. Reload and review your catalogue before saving.");
    }
    return { count: input.changes.length, slug: store.slug };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
