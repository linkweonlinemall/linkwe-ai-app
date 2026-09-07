"use server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { RECORD_FIELDS, type RecordKind } from "@/lib/admin/record-fields";
import { revalidatePath } from "next/cache";
async function admin() { const session = await getSession(); if (!session || session.role !== "ADMIN") throw new Error("Administrator access required."); return session; }
function fields(kind: RecordKind) {
  if (!Object.hasOwn(RECORD_FIELDS, kind)) throw new Error("Unknown record type.");
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name.toLowerCase() === (kind === "service" ? "product" : kind))!;
  return model.fields.filter((f) => (RECORD_FIELDS[kind] as readonly string[]).includes(f.name));
}
export async function getAdminEditableRecord(kind: RecordKind, id: string) {
  await admin();
  const metadata = fields(kind);
  const select = Object.fromEntries(metadata.map((f) => [f.name, true]));
  const record = kind === "product" || kind === "service" ? await prisma.product.findUnique({ where: { id, ...(kind === "service" ? { isService: true } : {}) }, select }) : kind === "store" ? await prisma.store.findUnique({ where: { id }, select }) : kind === "user" ? await prisma.user.findUnique({ where: { id }, select }) : await prisma.listing.findUnique({ where: { id }, select });
  if (!record) throw new Error("Record not found.");
  return metadata.map((f) => ({ name: f.name, type: f.type, required: f.isRequired, list: f.isList, options: f.kind === "enum" ? Prisma.dmmf.datamodel.enums.find((e) => e.name === f.type)?.values.map((v) => v.name).filter(v => v !== "COURIER") : undefined, value: f.name === "role" && (record as Record<string, unknown>)[f.name] === "COURIER" ? "CUSTOMER" : (record as Record<string, unknown>)[f.name] ?? null }));
}
export async function saveAdminEditableRecord(kind: RecordKind, id: string, values: Record<string, unknown>) {
  const session = await admin();
  try {
    const metadata = fields(kind);
    const data: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(values)) {
      const field = metadata.find((f) => f.name === key);
      if (!field) throw new Error(`Cannot edit ${key} here.`);
      let value = raw;
      if (field.isList) { if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) throw new Error(`${key} must be a list of text values.`); }
      else if (value == null || value === "") { if (field.isRequired) throw new Error(`${key} is required.`); value = field.type === "Json" ? Prisma.DbNull : null; }
      else if (field.type === "Boolean") { if (typeof value !== "boolean") throw new Error(`${key} must be true or false.`); }
      else if (["Int", "Float", "Decimal"].includes(field.type)) { value = Number(value); if (!Number.isFinite(value) || (field.type === "Int" && !Number.isInteger(value))) throw new Error(`${key} must be a valid number.`); if (!["latitude", "longitude"].includes(key) && Number(value) < 0) throw new Error(`${key} cannot be negative.`); }
      else if (field.type !== "Json" && typeof value !== "string") throw new Error(`${key} must be text.`);
      if (typeof value === "string" && value.length > 30000) throw new Error(`${key} is too long.`);
      if (value != null && field.kind === "enum" && !Prisma.dmmf.datamodel.enums.find((e) => e.name === field.type)?.values.some((v) => v.name === value)) throw new Error(`Invalid ${key}.`);
      if (key === "email" && (typeof value !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) throw new Error("Enter a valid email.");
      if (key === "slug" && (typeof value !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))) throw new Error("Use lowercase letters, numbers and hyphens for the slug.");
      if ((key === "latitude" && value != null && Math.abs(Number(value)) > 90) || (key === "longitude" && value != null && Math.abs(Number(value)) > 180)) throw new Error("Invalid map coordinates.");
      data[key] = value;
    }
    if (data.role === "COURIER") throw new Error("Courier accounts are retired. Choose Customer, Vendor or Admin.");
    if (typeof data.email === "string") data.email = data.email.trim().toLowerCase();
    if (kind === "service") {
      if (data.durationMinutes === 0 || data.maxGroupSize === 0 || data.maxPerDay === 0) throw new Error("Duration and capacity must be greater than zero.");
      for (const key of ["availableFrom", "availableTo"]) if (data[key] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(data[key]))) throw new Error("Use HH:MM for availability times.");
      if (data.requiresDeposit && (typeof data.depositAmount !== "number" || data.depositAmount <= 0 || (typeof data.price === "number" && data.depositAmount > data.price))) throw new Error("Deposit must be greater than zero and no more than the service price.");
      if (data.serviceType) data.isBookable = ["BOOKABLE", "VIRTUAL"].includes(String(data.serviceType));
    }
    await prisma.$transaction(async (tx) => {
      if (kind === "user") {
        const target = await tx.user.findUniqueOrThrow({ where: { id }, select: { email: true, role: true } });
        if (data.role && data.role !== target.role && id === session.userId) throw new Error("Ask another admin to change your own role so you do not lose access mid-session.");
        if (target.role === "ADMIN" && data.role && data.role !== "ADMIN" && await tx.user.count({ where: { role: "ADMIN", isActive: true, suspended: false } }) <= 1) throw new Error("Keep at least one active administrator.");
        if (data.email && data.email !== target.email) { data.emailVerified = null; data.emailVerifyToken = null; data.resetToken = null; }
        await tx.user.update({ where: { id }, data: data as Prisma.UserUpdateInput });
      } else if (kind === "product" || kind === "service") await tx.product.update({ where: { id, ...(kind === "service" ? { isService: true } : {}) }, data: data as Prisma.ProductUpdateInput });
      else if (kind === "store") await tx.store.update({ where: { id }, data: data as Prisma.StoreUpdateInput });
      else await tx.listing.update({ where: { id }, data: data as Prisma.ListingUpdateInput });
      await tx.notification.create({ data: { userId: session.userId, type: "GENERAL", title: `Updated ${kind}`, body: `${id}: ${Object.keys(data).join(", ")}`, linkUrl: `/dashboard/admin/records/${kind}/${id}` } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/dashboard/admin", "layout"); revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) { return { error: error instanceof Prisma.PrismaClientKnownRequestError ? "Could not save. Check for a duplicate slug, email or phone." : error instanceof Error ? error.message : "Unable to save record." }; }
}
