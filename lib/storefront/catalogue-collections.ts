import type { CatalogueItem } from './catalogue-filters';

export type PublicCatalogueCollection = {
  id: string;
  name: string;
  description?: string | null;
  productIds: string[];
};

/** Input listings have already passed the public store's tenant and publication gate.
 * Intersect rather than fetching IDs: stale, draft, or foreign memberships cannot appear. */
export function visibleCollectionItems(collection: PublicCatalogueCollection, items: CatalogueItem[]) {
  const ids = new Set(collection.productIds);
  const seen = new Set<string>();
  return items.filter(item => {
    const key = `${item.isService ? 'service' : 'product'}:${item.id}`;
    if (!ids.has(item.id) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
