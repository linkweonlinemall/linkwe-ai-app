import { Prisma } from "@prisma/client";
import { RECORD_FIELDS } from "@/lib/admin/record-fields";
import { FIELD_HELP, humanLabel, type RecordField } from "@/lib/admin/record-design";
import { validateRecordState, validateRecordValues } from "@/lib/admin/record-validation";
import { PRODUCT_CATEGORIES, SERVICE_CATEGORIES } from "@/lib/categories";
import { SUBSCRIPTION_INTERVAL_KEYS } from "@/lib/finance/subscription-interval";
import { getStorePlan } from "@/lib/finance/store-plan";
import { canVendorUsePayOnArrival } from "@/lib/services/payment-policy";
import { SERVICE_OFFER_FIELD_NAMES, SERVICE_OFFER_MAX_LENGTH } from "@/lib/services/offer-fields";

export type VendorListingKind = "product" | "service";

// These have dedicated workflows or are managed by LinkWe. Do not turn database
// columns into unrestricted AI writes. New approved form fields flow from the
// shared registry; ownership, system fields and these exceptions stay protected.
export const LISTING_FIELD_WORKFLOWS: Record<string, string> = {
  slug: "Managed by the listing editor; changing a public URL needs care.",
  images: "Use the photo upload and gallery tools.",
  hasVariants: "Use the product variation editor to preserve variation IDs and stock.",
  isDigital: "Chosen when creating a listing; use the product editor for delivery type.",
  digitalFileUrl: "Choose a file in the product editor's private upload control.",
  fileType: "Set by the private file upload.",
  fileSizeKb: "Set by the private file upload.",
  isArchived: "Use the Creation Library archive/restore controls.",
  isBookable: "Derived from the service type; use the booking editor for products.",
  deliveryFee: "Delivery rates are managed by LinkWe.",
  deliveryRegions: "Delivery regions are managed by LinkWe.",
};

export function vendorListingFields(kind: VendorListingKind): RecordField[] {
  const allowed: readonly string[] = RECORD_FIELDS[kind];
  return Prisma.dmmf.datamodel.models.find(model => model.name === "Product")!.fields
    .filter(field => field.kind !== "object" && allowed.includes(field.name) && !Object.hasOwn(LISTING_FIELD_WORKFLOWS, field.name))
    .map(field => ({
      name: field.name, type: field.type, required: field.isRequired, list: field.isList,
      value: field.isList ? [] : ["string", "number", "boolean"].includes(typeof field.default) ? field.default : null,
      options: field.name === "category" ? (kind === "service" ? SERVICE_CATEGORIES : PRODUCT_CATEGORIES).map(category => category.value)
        : field.name === "subscriptionInterval" ? [...SUBSCRIPTION_INTERVAL_KEYS]
        : field.kind === "enum" ? Prisma.dmmf.datamodel.enums.find(value => value.name === field.type)?.values.map(value => value.name) : undefined,
    }));
}

export function vendorListingFieldProperties(kind: VendorListingKind) {
  return recordFieldProperties(vendorListingFields(kind));
}

export function vendorListingUpdateProperties() {
  return {
    ...vendorListingFieldProperties("product"),
    ...vendorListingFieldProperties("service"),
    category: {
      type: ["string", "null"],
      enum: [...new Set([...PRODUCT_CATEGORIES, ...SERVICE_CATEGORIES].map(category => category.value)), null],
      description: "Choose a category from this listing's current editableFields guide. Products and services have different category choices. Null clears it.",
    },
  };
}

export function recordFieldProperties(fields: RecordField[]) {
  return Object.fromEntries(fields.map(field => {
    const schema: Record<string, unknown> = field.list
      ? { type: "array", items: { type: "string" }, maxItems: 100 }
      : field.type === "Json"
        ? { type: "array", maxItems: 20, items: { type: "object", properties: { id: { type: "string" }, label: { type: "string" }, type: { type: "string", enum: ["text", "select", "multiselect", "upload", "checklist"] }, required: { type: "boolean" }, options: { type: "array", items: { type: "string" } } }, required: ["id", "label", "type", "required", "options"], additionalProperties: false } }
        : { type: field.type === "Boolean" ? "boolean" : field.type === "Int" ? "integer" : ["Float", "Decimal"].includes(field.type) ? "number" : "string" };
    if (!field.required && !field.list) schema.type = [schema.type, "null"];
    if (field.options) schema.enum = [...field.options, ...(!field.required ? [null] : [])];
    if ((SERVICE_OFFER_FIELD_NAMES as readonly string[]).includes(field.name)) schema.maxLength = SERVICE_OFFER_MAX_LENGTH;
    schema.description = `${humanLabel(field.name)}. ${FIELD_HELP[field.name] || ""} Omit to keep the current value.${!field.required && !field.list ? " Use null to clear." : ""}`;
    return [field.name, schema];
  }));
}

export function listingFieldGuide(kind: VendorListingKind) {
  return {
    kind,
    fields: vendorListingFieldProperties(kind),
    otherControls: Object.fromEntries(Object.entries(LISTING_FIELD_WORKFLOWS).filter(([name]) => (RECORD_FIELDS[kind] as readonly string[]).includes(name))),
    instructions: "Read the listing before editing. Send only requested changes. Preserve other fields and existing checkout question IDs. Only report saved changes after the update succeeds.",
  };
}

export function validateVendorListingPatch(
  kind: VendorListingKind,
  patch: Record<string, unknown>,
  current: Record<string, unknown>,
  store: { subscriptionPlan: string | null; subscriptionStatus: string | null },
) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch) || !Object.keys(patch).length) throw new Error("Choose at least one field to update.");
  if (Object.keys(patch).some(key => ["__proto__", "constructor", "prototype"].includes(key))) throw new Error("That field cannot be edited.");
  const data = validateRecordValues(vendorListingFields(kind), patch);
  if (Object.hasOwn(data, "price") && Number(data.price) > 10_000_000) throw new Error("Price is too high — please check the amount.");
  if (kind === "service") {
    if (typeof data.subscriptionInterval === "string") data.subscriptionInterval = data.subscriptionInterval.toLowerCase();
    if (Object.hasOwn(data, "serviceType") && !data.serviceType) throw new Error("Choose a service type.");
    if (data.category != null && !SERVICE_CATEGORIES.some(category => category.value === data.category)) throw new Error("Choose an available service category.");
    if (Object.hasOwn(data, "serviceDuration") && data.serviceDuration != null && !Object.hasOwn(data, "durationMinutes")) data.durationMinutes = data.serviceDuration;
    const merged = { ...current, ...data };
    const type = String(merged.serviceType);
    if (["BOOKABLE", "VIRTUAL"].includes(type) && ["serviceType", "serviceDuration"].some(key => Object.hasOwn(data, key)) && !(Number(merged.serviceDuration) > 0)) throw new Error("Enter a duration greater than zero for this bookable service.");
    if (Object.hasOwn(data, "serviceType")) data.isBookable = ["BOOKABLE", "VIRTUAL"].includes(type);
    if (type === "QUOTE" && merged.quotePriceType === "FREE_QUOTE" && ["serviceType", "quotePriceType", "price"].some(key => Object.hasOwn(data, key))) data.price = 0;
    const onlineOnly = ["VIRTUAL", "SUBSCRIPTION"].includes(type) || !canVendorUsePayOnArrival(store.subscriptionPlan, store.subscriptionStatus);
    if (onlineOnly && data.bookingPaymentMode != null && data.bookingPaymentMode !== "ONLINE_ONLY") throw new Error("This service and plan require online payment.");
    if (onlineOnly && Object.hasOwn(data, "serviceType")) data.bookingPaymentMode = "ONLINE_ONLY";
    const { limits } = getStorePlan(store);
    if ((Object.hasOwn(data, "price") || data.isPublished === true) && limits.serviceMaxPriceMinor !== null && Math.round(Number(data.price ?? current.price) * 100) > limits.serviceMaxPriceMinor) throw new Error("Your current plan limits services to TTD 100. Upgrade to offer a higher-priced service.");
  }
  validateRecordState(kind, { ...current, ...data }, Object.keys(data));
  return data;
}
