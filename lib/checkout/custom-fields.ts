export const CHECKOUT_FIELD_TYPES = ["text", "select", "multiselect", "upload", "checklist"] as const;
export type CheckoutFieldType = (typeof CHECKOUT_FIELD_TYPES)[number];
export type CheckoutField = { id: string; label: string; type: CheckoutFieldType; required: boolean; options: string[] };
export type CheckoutResponses = Record<string, Record<string, string | string[]>>;

export function parseCheckoutFields(value: unknown): CheckoutField[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim().slice(0, 120) : "";
    const type = typeof row.type === "string" && CHECKOUT_FIELD_TYPES.includes(row.type as CheckoutFieldType)
      ? row.type as CheckoutFieldType : "text";
    if (!label) return [];
    const rawOptions = Array.isArray(row.options) ? row.options : [];
    const options = rawOptions.flatMap((option) => typeof option === "string" && option.trim() ? [option.trim().slice(0, 80)] : []).slice(0, 30);
    return [{ id: typeof row.id === "string" && row.id ? row.id.slice(0, 80) : crypto.randomUUID(), label, type, required: row.required === true, options }];
  });
}

export function validateCheckoutResponses(fields: CheckoutField[], responses: Record<string, string | string[]> | undefined): string | null {
  for (const field of fields) {
    const value = responses?.[field.id];
    const values = Array.isArray(value) ? value.filter(Boolean) : typeof value === "string" ? [value.trim()].filter(Boolean) : [];
    if (field.required && values.length === 0) return `Please complete “${field.label}”.`;
    if ((field.type === "select" || field.type === "multiselect" || field.type === "checklist") && values.some((item) => !field.options.includes(item))) {
      return `Choose a valid response for “${field.label}”.`;
    }
  }
  return null;
}
