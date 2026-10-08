import { Prisma } from "@prisma/client";
import type { RecordField } from "@/lib/admin/record-design";
import { validateRecordValues } from "@/lib/admin/record-validation";
import { recordFieldProperties } from "./vendor-listing-fields";

const names = ["name", "price", "quantity", "description", "perks", "maxPerOrder", "saleStartDate", "saleEnds", "isVisible", "color"];
const fields: RecordField[] = Prisma.dmmf.datamodel.models.find(model => model.name === "EventTicketType")!.fields
  .filter(field => names.includes(field.name))
  .map(field => ({ name: field.name, type: field.type, list: false, required: field.isRequired, value: null }));

export const TICKET_FIELD_PROPERTIES = {
  ...recordFieldProperties(fields),
  perks: { type: ["string", "null"], description: "What's included / ticket perks. Edit this field for included food, drinks, access or other benefits. Null clears it." },
};

export function ticketPatchFormData(patch: Record<string, unknown>) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch) || !Object.keys(patch).length) throw new Error("Choose a ticket field to change.");
  if (Object.keys(patch).some(key => ["__proto__", "constructor", "prototype"].includes(key))) throw new Error("That field cannot be edited.");
  const values = validateRecordValues(fields, patch);
  for (const key of ["quantity", "maxPerOrder"]) if (Object.hasOwn(values, key) && Number(values[key]) < 1) throw new Error("Ticket quantity and maximum per order must be at least one.");
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value == null ? "" : String(value));
  return data;
}
