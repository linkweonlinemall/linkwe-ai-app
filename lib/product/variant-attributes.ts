/** Canonical option shape shared by vendor, admin, imports and storefront. */
export type VariantAttribute = { name: string; value: string; hex?: string };

export function normalizeVariantAttributes(raw: unknown): VariantAttribute[] {
  if (!raw || typeof raw !== "object") throw new Error("Variation options must be an array or a text map.");
  const rows: unknown[] = Array.isArray(raw)
    ? raw
    : Object.entries(raw).map(([name, value]) => ({ name, value }));
  const seen = new Set<string>();
  return rows.map((rawRow) => {
    if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow)) throw new Error("Each variation option needs a name and value.");
    const row = rawRow as Record<string, unknown>;
    if (typeof row.name !== "string" || !row.name.trim() || typeof row.value !== "string" || !row.value.trim()) throw new Error("Variation option names and values must be non-empty text.");
    const label = row.name.trim();
    const key = label.toLowerCase();
    const name = key === "color" || key === "colour" ? "Colour" : key === "size" ? "Size" : label;
    const identity = name.toLowerCase();
    if (seen.has(identity)) throw new Error("A variation option name is duplicated.");
    seen.add(identity);
    if (row.hex !== undefined && (typeof row.hex !== "string" || !/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(row.hex))) throw new Error("Variation colour hex must be a valid hex colour.");
    return { name, value: row.value.trim(), ...(row.hex !== undefined ? { hex: row.hex as string } : {}) };
  });
}
