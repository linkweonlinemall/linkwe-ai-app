export type StudioValues = Record<string, unknown>;
export type StudioAction = { name: string; description: string; parameters: Record<string, unknown> };
export type StudioStep = { action: string; args: StudioValues };
export type StudioSnapshot = { key: string; title: string; state: StudioValues; actions: StudioAction[] };
export type StudioReview = { title: string; description: string; fields: { label: string; value: string }[] };
export type StudioActionResult = { message: string; waitFor?: string; stop?: boolean };
export type StudioSurface = StudioSnapshot & {
  busy?: boolean;
  run: (step: StudioStep) => Promise<StudioActionResult> | StudioActionResult;
  review?: (step: StudioStep) => StudioReview | null;
  canLeave?: () => boolean;
};

// These values stay in the form and are never included in model context or receipts.
export function redactStudioSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactStudioSecrets);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, /password|credential|accountNumber|secret|token/i.test(key) ? (entry ? "[entered privately]" : "") : redactStudioSecrets(entry)]));
  return value;
}
export function validateStudioPatch(patch: unknown, allowed: readonly string[]): StudioValues {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new Error("Choose the fields to change.");
  if (Object.keys(patch).some(key => !allowed.includes(key) || ["__proto__", "constructor", "prototype"].includes(key))) throw new Error("One of those fields is not editable in this form.");
  return patch as StudioValues;
}
export function studioReviewValue(value: unknown): string {
  if (value == null || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(studioReviewValue).join("\n");
  if (typeof value === "object") return Object.entries(value).map(([key, v]) => `${key.replace(/([a-z])([A-Z])/g, "$1 $2")}: ${studioReviewValue(v)}`).join("\n");
  return String(value).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();
}
export const objectParameters = (properties: Record<string, unknown> = {}, required: string[] = []) => ({ type: "object", properties, required, additionalProperties: false });
