import { type ImportBatchView, type ImportKind, type Values, rowTitle } from "./model";

export function importPhotos(kind: ImportKind, values: Values): string[] {
  return [...new Set((kind === "event" ? [values.coverImage, ...(Array.isArray(values.galleryImages) ? values.galleryImages : [])] : kind === "vendor" ? [values.coverPhotoUrl, ...(Array.isArray(values.storeGallery) ? values.storeGallery : [])] : Array.isArray(values.images) ? values.images : []).filter(Boolean).map(String))];
}
export function importPhotoPatch(kind: ImportKind, urls: string[]): Values {
  return kind === "vendor" ? { storeGallery: urls, coverPhotoUrl: urls[0] || null } : kind === "event" ? { coverImage: urls[0] || null, galleryImages: urls.slice(1) } : { images: urls };
}
export function planPhotoAssignments(batch: ImportBatchView, assignments: Record<string, string>) {
  const knownAssets = new Map(batch.assets.map(asset => [asset.id, asset]));
  const grouped = new Map<string, string[]>();
  for (const [assetId, rowId] of Object.entries(assignments)) {
    if (!rowId) continue;
    const asset = knownAssets.get(assetId);
    if (!asset) throw new Error("A selected photo is no longer available. Reopen the photo library.");
    const row = batch.rows.find(row => row.id === rowId && row.state !== "removed");
    if (!row) throw new Error("A destination is no longer available. Choose another destination.");
    grouped.set(rowId, [...(grouped.get(rowId) || importPhotos(batch.kind, row.values)), asset.url]);
  }
  return [...grouped].map(([id, urls]) => {
    const row = batch.rows.find(row => row.id === id)!;
    const unique = [...new Set(urls)];
    if (unique.length > 20) throw new Error(`${rowTitle(batch.kind, row.values)} would have ${unique.length} photos. Choose up to 20 photos per destination.`);
    return { id, patch: importPhotoPatch(batch.kind, unique), added: unique.length - importPhotos(batch.kind, row.values).length };
  }).filter(plan => plan.added > 0);
}
