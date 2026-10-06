import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { cleanRichText } from "@/lib/content/rich-text";
import { hashPassword } from "@/lib/auth/password";
import { RecordValidationError, safeUrl, validateRecordState, validateRecordValues } from "@/lib/admin/record-validation";
import { canVendorUsePayOnArrival } from "@/lib/services/payment-policy";
import { importFields } from "./fields";
import type { ImportKind, Values } from "./model";

type Tx = Prisma.TransactionClient;
export const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));
export const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "draft";
const error = (field: string, message: string): never => { throw new RecordValidationError({ [field]: message }); };
function databaseValues(kind: ImportKind, values: Values) {
  const fields = importFields(kind);
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value == null && fields.find(f => f.name === key)?.type === "Json" ? Prisma.DbNull : value]));
}
export function validateDraft(kind: ImportKind, values: Values) {
  const fields = importFields(kind);
  const result = validateRecordValues(fields.map(f => ({ ...f, value: f.value ?? null, required: false })), values);
  for (const key of ["description", "shortDescription", "returnPolicy", "policies", "refundPolicy", "serviceInclusions", "serviceRequirements", "serviceDeliverables"]) {
    if (typeof result[key] === "string" && String(result[key]).includes("<")) result[key] = cleanRichText(String(result[key]));
  }
  for (const field of fields.filter(f => f.type === "Json")) if (result[field.name] != null && typeof result[field.name] !== "object") error(field.name, "Complete this structured field with valid details before saving.");
  if (result.email) result.email = String(result.email).toLowerCase();
  for (const key of ["coverImage", "streamUrl", "ticketUrl"]) if (result[key] && !safeUrl(String(result[key]))) error(key, "Use a valid HTTP or HTTPS URL.");
  for (const key of ["galleryImages"]) if (Array.isArray(result[key]) && ((result[key] as unknown[]).length > 20 || (result[key] as unknown[]).some(v => !safeUrl(String(v))))) error(key, "Use up to 20 valid image URLs.");
  if (kind === "event") {
    if (result.startDate && result.endDate && new Date(String(result.endDate)) <= new Date(String(result.startDate))) error("endDate", "The end must be after the start.");
    if (result.startDate && result.registrationDeadline && new Date(String(result.registrationDeadline)) > new Date(String(result.startDate))) error("registrationDeadline", "Registration must close before the event starts.");
  }
  return result;
}
export async function readImportRecord(tx: Tx, kind: ImportKind, id: string) {
  let record: Values | null;
  if (kind === "vendor") {
    const store = await tx.store.findUnique({ where: { id }, include: { owner: { select: { id: true, fullName: true, email: true, phone: true, region: true } }, images: { orderBy: { position: "asc" } } } });
    record = store ? { ...store, vendorId: store.owner.id, vendorName: store.owner.fullName, email: store.owner.email, phone: store.owner.phone, vendorRegion: store.owner.region, storeGallery: store.images.map(i => i.url) } : null;
  } else if (kind === "event") record = await tx.event.findUnique({ where: { id }, include: { ticketTypes: { orderBy: { createdAt: "asc" } } } });
  else record = await tx.product.findFirst({ where: { id, isService: kind === "service" }, include: kind === "product" ? { variants: { orderBy: { createdAt: "asc" } } } : undefined });
  if (!record) return null;
  const values = Object.fromEntries(importFields(kind).filter(f => Object.hasOwn(record!, f.name)).map(f => [f.name, record![f.name]]));
  // Child IDs remain stable; sold quantities are deliberately never editable.
  if (kind === "product") values.variants = (record.variants as Values[]).map(v => Object.fromEntries(["id", "name", "sku", "price", "stock", "images", "attributes"].map(key => [key, v[key]])));
  if (kind === "event") values.ticketTypes = (record.ticketTypes as Values[]).map(v => Object.fromEntries(["id", "name", "price", "quantity", "description", "saleEnds", "saleStartDate", "maxPerOrder", "perks", "validDays", "isVisible", "color"].map(key => [key, v[key]])));
  return JSON.parse(JSON.stringify({ values, isPublished: record.isPublished ?? false, isArchived: record.isArchived ?? false, status: record.status ?? null, storeId: kind === "vendor" ? id : record.storeId })) as { values: Values; isPublished: boolean; isArchived: boolean; status: string | null; storeId: string };
}
export type RecordSnapshot = NonNullable<Awaited<ReturnType<typeof readImportRecord>>>;

async function resolveStore(tx: Tx, values: Values, defaultStoreId: string | null) {
  const id = String(values.storeId || defaultStoreId || "");
  const store = id ? await tx.store.findUnique({ where: { id } }) : values.storeSlug ? await tx.store.findUnique({ where: { slug: String(values.storeSlug) } }) : null;
  if (!store) return error("storeId", "Choose a store, or provide an exact store ID or URL name.");
  if (values.storeSlug && values.storeSlug !== store.slug) error("storeSlug", "The store ID and URL name refer to different stores.");
  return store;
}
async function resolveVendor(tx: Tx, values: Values) {
  const byEmail = values.email ? await tx.user.findFirst({ where: { email: { equals: String(values.email), mode: "insensitive" } } }) : null;
  const user = values.vendorId ? await tx.user.findUnique({ where: { id: String(values.vendorId) } }) : byEmail;
  if (values.vendorId && !user) error("vendorId", "This vendor ID was not found.");
  if (user && values.vendorId && values.email && user.email.toLowerCase() !== String(values.email).toLowerCase()) error("email", "Vendor ID and email do not match. Edit the email after linking the existing account.");
  if (user && (user.role !== "VENDOR" || !user.isActive || user.suspended)) error("email", "This account is not an active vendor. Review its access in People first.");
  return user;
}
export async function findImportDuplicate(tx: Tx, kind: ImportKind, values: Values, defaultStoreId: string | null) {
  if (kind === "vendor") {
    const user = await resolveVendor(tx, values);
    if (!user) return null;
    const store = await tx.store.findUnique({ where: { ownerId: user.id } });
    if (store && String(values.name || "").trim().toLowerCase() !== store.name.trim().toLowerCase() && values.slug !== store.slug) error("name", `This vendor already owns “${store.name}”. One store is allowed per vendor. Use its name to review or explicitly update it.`);
    return store?.id || null;
  }
  const store = await resolveStore(tx, values, defaultStoreId);
  if (values.recordId) {
    const record = await readImportRecord(tx, kind, String(values.recordId));
    if (!record || record.storeId !== store.id) error("recordId", "The item ID does not belong to this store and import type.");
    return String(values.recordId);
  }
  const matches = kind === "event"
    ? await tx.event.findMany({ where: { storeId: store.id, OR: [ ...(values.slug ? [{ slug: String(values.slug) }] : []), { title: { equals: String(values.title || ""), mode: "insensitive" as const }, ...(values.startDate ? { startDate: new Date(String(values.startDate)) } : {}) } ] }, select: { id: true }, take: 2 })
    : await tx.product.findMany({ where: { storeId: store.id, isService: kind === "service", OR: [ ...(values.sku ? [{ sku: { equals: String(values.sku), mode: "insensitive" as const } }] : []), ...(values.slug ? [{ slug: String(values.slug) }] : []), { name: { equals: String(values.name || ""), mode: "insensitive" as const } } ] }, select: { id: true }, take: 2 });
  if (matches.length > 1) error("recordId", "More than one existing item matches. Enter its exact item ID.");
  return matches[0]?.id || null;
}
async function saveVariants(tx: Tx, productId: string, raw: unknown) {
  if (!Array.isArray(raw) || raw.length > 100) error("variants", "Use up to 100 product variations.");
  const rows = raw as Values[];
  const existing = await tx.productVariant.findMany({ where: { productId } });
  const ids = rows.map(v => v.id).filter(Boolean);
  if (new Set(ids).size !== ids.length || ids.some(id => !existing.some(v => v.id === id))) error("variants", "A variation ID is duplicated or belongs to another product.");
  if (existing.some(v => !ids.includes(v.id))) error("variants", "Keep existing variations; set stock to zero to retire one.");
  for (const v of rows) {
    if (!v || typeof v.name !== "string" || !v.name.trim()) error("variants", "Every variation needs a name.");
    const price = v.price === "" || v.price == null ? null : Number(v.price), stock = v.stock === "" || v.stock == null ? null : Number(v.stock);
    if ((price != null && (!Number.isFinite(price) || price < 0)) || (stock != null && (!Number.isSafeInteger(stock) || stock < 0))) error("variants", "Variation prices and whole-number stock must be zero or greater.");
    const images = v.images ?? [], attributes = v.attributes ?? {};
    if (!Array.isArray(images) || images.length > 20 || images.some(u => typeof u !== "string" || !safeUrl(u)) || !attributes || typeof attributes !== "object" || Array.isArray(attributes) || Object.values(attributes).some(a => typeof a !== "string")) error("variants", "Check variation photos and options.");
    const data = { name: String(v.name).trim(), sku: v.sku ? String(v.sku) : null, price, stock, images: images as string[], attributes: json(attributes) };
    if (v.id) await tx.productVariant.update({ where: { id: String(v.id) }, data });
    else await tx.productVariant.create({ data: { ...data, productId } });
  }
}
async function saveTicketTypes(tx: Tx, eventId: string, raw: unknown) {
  if (!Array.isArray(raw) || raw.length > 100) error("ticketTypes", "Use up to 100 ticket tiers.");
  const rows = raw as Values[];
  const existing = await tx.eventTicketType.findMany({ where: { eventId } });
  const ids = rows.map(v => v.id).filter(Boolean);
  if (new Set(ids).size !== ids.length || ids.some(id => !existing.some(v => v.id === id))) error("ticketTypes", "A ticket tier ID is duplicated or belongs to another event.");
  if (existing.some(v => !ids.includes(v.id))) error("ticketTypes", "Keep existing tiers; turn visibility off to retire one.");
  for (const v of rows) {
    if (!v || typeof v.name !== "string" || !v.name.trim()) error("ticketTypes", "Each tier needs a name.");
    const price = Number(v.price), quantity = Number(v.quantity), maxPerOrder = Number(v.maxPerOrder ?? 10);
    if (!Number.isFinite(price) || price < 0 || !Number.isSafeInteger(quantity) || quantity < 0 || !Number.isSafeInteger(maxPerOrder) || maxPerOrder < 1) error("ticketTypes", "Check tier prices, quantities and per-order limits.");
    const old = existing.find(t => t.id === v.id);
    if (old && quantity < old.quantitySold + old.externalSold) error("ticketTypes", "Capacity cannot be less than tickets already sold.");
    const saleStartDate = v.saleStartDate ? new Date(String(v.saleStartDate)) : null, saleEnds = v.saleEnds ? new Date(String(v.saleEnds)) : null;
    if ((saleStartDate && !Number.isFinite(+saleStartDate)) || (saleEnds && !Number.isFinite(+saleEnds)) || (saleStartDate && saleEnds && saleEnds <= saleStartDate)) error("ticketTypes", "Check ticket sale dates.");
    if (v.isVisible != null && typeof v.isVisible !== "boolean") error("ticketTypes", "Tier visibility must be on or off.");
    const data = { name: String(v.name), price, quantity, maxPerOrder, description: v.description ? String(v.description) : null, perks: v.perks ? String(v.perks) : null, color: v.color ? String(v.color) : null, saleStartDate, saleEnds, validDays: v.validDays == null ? Prisma.DbNull : json(v.validDays), isVisible: v.isVisible !== false };
    if (old) await tx.eventTicketType.update({ where: { id: old.id }, data });
    else await tx.eventTicketType.create({ data: { ...data, eventId } });
  }
}
export async function persistImportRecord(tx: Tx, kind: ImportKind, input: Values, defaultStoreId: string | null, id?: string) {
  const values = validateDraft(kind, input);
  for (const field of importFields(kind)) if (field.required && Object.hasOwn(values, field.name) && values[field.name] == null) error(field.name, "Complete this field before saving the linked record. Incomplete rows can remain in the import batch.");
  if (!values[kind === "event" ? "title" : "name"]) error(kind === "event" ? "title" : "name", "Add a name before creating this record. Your row remains saved in this batch.");
  let createdUserId: string | null = null;
  const { vendorName, vendorId, email, phone, vendorRegion, storeId: ignoredStoreId, storeSlug: ignoredSlug, recordId: ignoredRecordId, storeGallery, variants, ticketTypes, ...base } = values;
  void ignoredStoreId; void ignoredSlug; void ignoredRecordId;
  if (!id && !base.slug) base.slug = `${slugify(String(base.name || base.title))}-${randomUUID().slice(0, 8)}`;
  if (kind === "vendor") {
    let user;
    if (id) {
      if (Object.hasOwn(values, "vendorName") && !vendorName) error("vendorName", "A vendor needs a full name.");
      if (Object.hasOwn(values, "email") && !email) error("email", "A vendor needs an email address.");
      const store = await tx.store.findUniqueOrThrow({ where: { id } });
      user = await tx.user.findUniqueOrThrow({ where: { id: store.ownerId } });
      if (vendorId && vendorId !== user.id) error("vendorId", "Moving a store to another vendor is not supported here.");
      if (user.role !== "VENDOR" || !user.isActive || user.suspended) error("email", "Review this vendor’s account access before editing.");
      const nextEmail = email ? String(email).toLowerCase() : user.email;
      await tx.user.update({ where: { id: user.id }, data: {
        ...(vendorName != null ? { fullName: String(vendorName) } : {}), email: nextEmail,
        ...(Object.hasOwn(values, "phone") ? { phone: phone ? String(phone) : null } : {}),
        ...(Object.hasOwn(values, "vendorRegion") ? { region: vendorRegion ? String(vendorRegion) : null } : {}),
        ...(nextEmail !== user.email ? { emailVerified: null, emailVerifyToken: null, emailVerifyTokenExpiry: null, resetToken: null, resetTokenExpiry: null } : {}),
      } });
    } else {
      user = await resolveVendor(tx, values);
      if (!user) {
        if (!email) error("email", "Add the vendor email. The row is saved until you complete it.");
        if (!vendorName) error("vendorName", "Add the vendor’s full name.");
        user = await tx.user.create({ data: { fullName: String(vendorName), email: String(email), phone: phone ? String(phone) : null, region: vendorRegion ? String(vendorRegion) : null, role: "VENDOR", passwordHash: await hashPassword(randomBytes(32).toString("base64url")) } });
        createdUserId = user.id;
      }
    }
    if (!id) { base.region ||= "Trinidad and Tobago"; base.categoryId ||= "other"; }
    const data = databaseValues(kind, base);
    const store = id ? await tx.store.update({ where: { id }, data: data as Prisma.StoreUpdateInput }) : await tx.store.create({ data: { ...data, ownerId: user.id, status: "DRAFT" } as Prisma.StoreUncheckedCreateInput });
    id = store.id;
    if (Array.isArray(storeGallery)) {
      await tx.storeImage.deleteMany({ where: { storeId: id } });
      await tx.storeImage.createMany({ data: storeGallery.map((url, position) => ({ storeId: id!, url: String(url), position })) });
    }
  } else {
    const current = id ? await readImportRecord(tx, kind, id) : null;
    const store = await resolveStore(tx, { ...values, ...(current ? { storeId: current.storeId } : {}) }, defaultStoreId);
    if (current && values.storeId && values.storeId !== current.storeId) error("storeId", "Moving an imported item between stores is not supported.");
    if (kind === "event") {
      if (!base.startDate) error("startDate", "Add the event start date. This incomplete draft remains saved in the batch.");
      const data = databaseValues(kind, base);
      const event = id ? await tx.event.update({ where: { id }, data: data as Prisma.EventUpdateInput }) : await tx.event.create({ data: { ...data, storeId: store.id, tags: data.tags || [], galleryImages: data.galleryImages || [], isPublished: false, status: "DRAFT" } as Prisma.EventUncheckedCreateInput });
      id = event.id;
      if (ticketTypes != null) await saveTicketTypes(tx, id, ticketTypes);
    } else {
      if (!id) { base.price ??= 0; base.tags ??= []; base.images ??= []; }
      if (kind === "service" && (!id || base.serviceType || base.bookingPaymentMode)) {
        if (!id) { base.serviceType ||= "QUOTE"; if (base.serviceType === "QUOTE") base.quotePriceType ||= "FREE_QUOTE"; }
        base.isBookable = ["BOOKABLE", "VIRTUAL"].includes(String(base.serviceType ?? current?.values.serviceType));
        if (base.serviceType === "VIRTUAL" || !canVendorUsePayOnArrival(store.subscriptionPlan, store.subscriptionStatus)) base.bookingPaymentMode = "ONLINE_ONLY";
      }
      const data = databaseValues(kind, base);
      const product = id ? await tx.product.update({ where: { id }, data: data as Prisma.ProductUpdateInput }) : await tx.product.create({ data: { ...data, storeId: store.id, isService: kind === "service", isPublished: false, isArchived: false } as Prisma.ProductUncheckedCreateInput });
      id = product.id;
      if (variants != null) await saveVariants(tx, id, variants);
    }
  }
  const snapshot = (await readImportRecord(tx, kind, id!))!;
  if (snapshot.isPublished || snapshot.status === "ACTIVE") {
    const problems = publicationErrors(kind, snapshot);
    if (Object.keys(problems).length) throw new RecordValidationError(problems);
  }
  return { id: id!, createdUserId, snapshot };
}
export function publicationErrors(kind: ImportKind, snapshot: RecordSnapshot): Record<string, string> {
  const v = snapshot.values, errors: Record<string, string> = {};
  for (const key of [kind === "event" ? "title" : "name", "description", kind === "vendor" ? "categoryId" : "category"]) if (!v[key]) errors[key] = "Complete this before publishing.";
  const photos = kind === "vendor" ? v.coverPhotoUrl || v.logoUrl || (v.storeGallery as unknown[])?.length : kind === "event" ? v.coverImage : (v.images as unknown[])?.length;
  if (!photos) errors[kind === "vendor" ? "storeGallery" : kind === "event" ? "coverImage" : "images"] = "Add a photograph before publishing.";
  if (snapshot.isArchived) errors._publication = "Restore this item as a draft before publishing.";
  if (kind === "product" && v.isDigital && !v.digitalFileUrl) errors.digitalFileUrl = "Add the downloadable file.";
  if (kind === "event") {
    if (!Array.isArray(v.ticketTypes) || !v.ticketTypes.some(t => t && typeof t === "object" && (t as Values).isVisible !== false)) errors.ticketTypes = "Add at least one visible ticket tier before publishing.";
    if (!v.startDate || new Date(String(v.startDate)) <= new Date()) errors.startDate = "Choose a future start date.";
    if (v.isOnline ? !v.streamUrl : !v.venueName && !v.address) errors[v.isOnline ? "streamUrl" : "venueName"] = "Add the event location.";
    if (["CANCELLED", "COMPLETED"].includes(snapshot.status || "")) errors._publication = "An ended or cancelled event cannot be republished.";
  }
  try { validateRecordState(kind === "vendor" ? "store" : kind, v, Object.keys(v)); } catch (e) { if (e instanceof RecordValidationError) Object.assign(errors, e.fields); else throw e; }
  return errors;
}
export async function setImportLifecycle(tx: Tx, kind: ImportKind, id: string, operation: "publish" | "draft" | "archive") {
  const snapshot = await readImportRecord(tx, kind, id);
  if (!snapshot) throw new Error("This record no longer exists.");
  if (operation === "publish") {
    const problems = publicationErrors(kind, snapshot);
    if (Object.keys(problems).length) throw new RecordValidationError(problems);
  }
  if (kind === "vendor") await tx.store.update({ where: { id }, data: { status: operation === "publish" ? "ACTIVE" : "DRAFT" } });
  else if (kind === "event") {
    if (["CANCELLED", "COMPLETED"].includes(snapshot.status || "")) throw new Error("Use event management for ended or cancelled events.");
    await tx.event.update({ where: { id }, data: { isPublished: operation === "publish", status: operation === "publish" ? "PUBLISHED" : "DRAFT" } });
  } else await tx.product.update({ where: { id }, data: { isPublished: operation === "publish", isArchived: operation === "archive" } });
}
type CountDelegate = { count: (args: { where: Values }) => Promise<number> };
async function noDependants(tx: Tx, model: string, id: string, allowed: string[] = []) {
  for (const definition of Prisma.dmmf.datamodel.models) {
    if (allowed.includes(definition.name)) continue;
    for (const relation of definition.fields.filter(f => f.kind === "object" && f.type === model && f.relationFromFields?.length === 1 && f.relationToFields?.[0] === "id")) {
      const delegate = (tx as unknown as Record<string, CountDelegate>)[definition.name[0].toLowerCase() + definition.name.slice(1)];
      if (await delegate.count({ where: { [relation.relationFromFields![0]]: id } })) throw new Error("This record has linked activity. Keep it as a draft or archive it instead of deleting it.");
    }
  }
}
export async function deleteImportRecord(tx: Tx, kind: ImportKind, id: string, createdUserId: string | null) {
  const current = await readImportRecord(tx, kind, id);
  if (!current) return;
  if (current.isPublished || current.status === "ACTIVE") throw new Error("Save this record as a draft before deleting it.");
  if (kind === "vendor") {
    await noDependants(tx, "Store", id, ["StoreImage"]);
    await tx.storeImage.deleteMany({ where: { storeId: id } });
    await tx.store.delete({ where: { id } });
    // Newly created accounts are retained for audit and secure access. Existing accounts are never removed.
    void createdUserId;
  } else if (kind === "event") {
    await noDependants(tx, "Event", id, ["EventTicketType"]);
    for (const tier of await tx.eventTicketType.findMany({ where: { eventId: id } })) {
      if (tier.quantitySold || tier.externalSold) throw new Error("This event has ticket sales and cannot be removed.");
      await noDependants(tx, "EventTicketType", tier.id);
    }
    await tx.eventTicketType.deleteMany({ where: { eventId: id } });
    await tx.event.delete({ where: { id } });
  } else {
    await noDependants(tx, "Product", id, ["ProductVariant"]);
    for (const variant of await tx.productVariant.findMany({ where: { productId: id } })) await noDependants(tx, "ProductVariant", variant.id);
    await tx.productVariant.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
  }
}
