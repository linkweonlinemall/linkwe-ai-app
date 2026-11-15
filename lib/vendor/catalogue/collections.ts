import { CatalogueError } from './model';

export type CatalogueCollection = { id: string; name: string; description: string; productIds: string[] };
export const MAX_COLLECTIONS = 50;
export const MAX_COLLECTION_ITEMS = 500;
const validId = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(v);

/** Strict at the write boundary. Never silently remove invalid or duplicate entries. */
export function parseCollections(value: unknown): CatalogueCollection[] {
  if (!Array.isArray(value) || value.length > MAX_COLLECTIONS) throw new CatalogueError(`Use up to ${MAX_COLLECTIONS} collections.`);
  const ids = new Set<string>(), names = new Set<string>();
  return value.map(raw => {
    if (!raw || typeof raw !== 'object') throw new CatalogueError('Invalid collection.');
    const { id, name, description, productIds } = raw as Record<string, unknown>;
    if (!validId(id) || ids.has(id)) throw new CatalogueError('Invalid or duplicate collection ID.');
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 80 || names.has(name.trim().toLowerCase())) throw new CatalogueError('Give each collection a unique name of up to 80 characters.');
    if (typeof description !== 'string' || description.trim().length > 240) throw new CatalogueError('Collection descriptions can have up to 240 characters.');
    if (!Array.isArray(productIds) || productIds.length > MAX_COLLECTION_ITEMS || productIds.some(id => !validId(id)) || new Set(productIds).size !== productIds.length) throw new CatalogueError(`Choose up to ${MAX_COLLECTION_ITEMS} distinct listings per collection.`);
    ids.add(id); names.add(name.trim().toLowerCase());
    return { id, name: name.trim(), description: description.trim(), productIds: productIds as string[] };
  });
}

export function parseCollectionsUpdate(value: unknown) {
  if (!value || typeof value !== 'object') throw new CatalogueError('Invalid collection update.');
  const { storeId, expectedRevision, collections } = value as Record<string, unknown>;
  if (!validId(storeId) || !Number.isSafeInteger(expectedRevision) || (expectedRevision as number) < 0) throw new CatalogueError('Invalid catalogue revision. Reload the page.');
  return { storeId, expectedRevision: expectedRevision as number, collections: parseCollections(collections) };
}

/** Project only already-authorized listings. Draft, foreign, archived and deleted IDs never leave the server. */
export function publicCollections(value: unknown, visibleIds: ReadonlySet<string>): CatalogueCollection[] {
  let collections: CatalogueCollection[];
  try { collections = parseCollections(value); } catch { return []; }
  return collections.map(collection => ({ ...collection, productIds: collection.productIds.filter(id => visibleIds.has(id)) }));
}
