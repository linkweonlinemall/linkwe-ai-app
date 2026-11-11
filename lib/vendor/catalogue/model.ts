export type CatalogueListing = {
  id: string; name: string; category: string | null; isService: boolean;
  isPublished: boolean; isArchived: boolean; isFeatured: boolean;
};
export type CatalogueChange = { id: string; selected: boolean; expected: boolean };
export class CatalogueError extends Error {}
export function parseCatalogueChanges(value: unknown): { storeId: string; changes: CatalogueChange[] } {
  if (!value || typeof value !== "object") throw new CatalogueError("Invalid catalogue update.");
  const { storeId, changes } = value as Record<string, unknown>;
  const validId = (id: unknown): id is string => typeof id === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
  if (!validId(storeId) || !Array.isArray(changes) || changes.length < 1 || changes.length > 500)
    throw new CatalogueError("Save between 1 and 500 listing changes at a time.");
  const seen = new Set<string>();
  const parsed = changes.map(value => {
    if (!value || typeof value !== "object") throw new CatalogueError("Invalid listing selection.");
    const { id, selected, expected } = value as Record<string, unknown>;
    if (!validId(id) || typeof selected !== "boolean" || typeof expected !== "boolean" || seen.has(id))
      throw new CatalogueError("Invalid or duplicate listing selection.");
    seen.add(id);
    return { id, selected, expected };
  });
  return { storeId, changes: parsed.sort((a, b) => a.id.localeCompare(b.id)) };
}
