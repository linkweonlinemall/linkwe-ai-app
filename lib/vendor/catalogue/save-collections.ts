import 'server-only';
import { Prisma, type PrismaClient } from '@prisma/client';
import { CatalogueError } from './model';
import { parseCollectionsUpdate } from './collections';

/** All collection writes are store-scoped and compare-and-swap. No product writes. */
export async function saveCollections(db: PrismaClient, actorId: string, value: unknown) {
  const input = parseCollectionsUpdate(value);
  return db.$transaction(async tx => {
    const store = await tx.store.findUnique({ where: { ownerId: actorId }, select: { id: true, slug: true } });
    if (!store || store.id !== input.storeId) throw new CatalogueError('Sign in to the store that opened these collections.');
    const ids = [...new Set(input.collections.flatMap(collection => collection.productIds))];
    const owned = await tx.product.findMany({ where: { storeId: store.id, id: { in: ids }, isArchived: false }, select: { id: true } });
    if (owned.length !== ids.length) throw new CatalogueError('A selected listing is no longer available in your store. Reload and review your collections.');
    const saved = await tx.store.updateMany({
      where: { id: store.id, ownerId: actorId, catalogueRevision: input.expectedRevision },
      data: { catalogueCollections: input.collections, catalogueRevision: { increment: 1 } },
    });
    if (saved.count !== 1) throw new CatalogueError('Your collections changed elsewhere. Reload before saving to avoid overwriting those changes.');
    return { slug: store.slug, revision: input.expectedRevision + 1 };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
