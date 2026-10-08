import { Prisma } from "@prisma/client";
import { RECORD_FIELDS } from "@/lib/admin/record-fields";
import { humanLabel } from "@/lib/admin/record-design";
import type { ImportField, ImportKind } from "./model";

const eventExcluded = ["id", "storeId", "viewCount", "isPublished", "status", "scanCode", "scanCodeSetAt", "createdAt", "updatedAt"];
const lifecycle = ["isPublished", "isArchived", "status", "onboardingStep", "subscriptionPlan", "subscriptionStatus", "planRenewsAt", "pastDueSince", "autoRenew"];
export function importFields(kind: ImportKind): ImportField[] {
  const model = kind === "vendor" ? "Store" : kind === "event" ? "Event" : "Product";
  const allowed = kind === "event" ? null : RECORD_FIELDS[kind === "vendor" ? "store" : kind];
  const fields: ImportField[] = Prisma.dmmf.datamodel.models.find(m => m.name === model)!.fields
    .filter(f => f.kind !== "object" && (allowed ? (allowed as readonly string[]).includes(f.name) && !lifecycle.includes(f.name) : !eventExcluded.includes(f.name)))
    .map(f => ({
      name: f.name, label: humanLabel(f.name), type: f.type, list: f.isList,
      required: f.isRequired, group: "Details",
      value: f.isList ? [] : ["string", "number", "boolean"].includes(typeof f.default) ? f.default : null,
      options: f.kind === "enum" ? Prisma.dmmf.datamodel.enums.find(e => e.name === f.type)?.values.map(v => v.name) : undefined,
    }));
  const text = (name: string, label: string, lookup = false, group = "Link to a store"): ImportField => ({ name, label, lookup, group, type: "String", list: false, required: false });
  if (kind === "vendor") fields.unshift(text("vendorId", "Existing vendor ID", true, "Vendor"), text("vendorName", "Vendor full name", false, "Vendor"), text("email", "Vendor email", false, "Vendor"), text("phone", "Vendor phone", false, "Vendor"), text("vendorRegion", "Vendor region", false, "Vendor"));
  else fields.unshift(text("storeId", "Store ID", true), text("storeSlug", "Store URL name", true), text("recordId", "Existing item ID", true));
  if (kind === "vendor") fields.push({ ...text("storeGallery", "Store photographs", false, "Photos"), list: true });
  if (kind === "product") fields.push({ ...text("variants", "Product variations", false), type: "Json", value: [] });
  if (kind === "event") fields.push({ ...text("ticketTypes", "Ticket tiers", false), type: "Json", value: [] });
  return fields;
}
