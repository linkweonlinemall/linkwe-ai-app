"use server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveWarehouseSettings(input: { name: string; line1: string; city: string; region: string; phone: string; latitude: string; longitude: string }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return { error: "Administrator access required." };
  if ([input.name, input.line1, input.city, input.region, input.phone].some((v) => typeof v !== "string" || !v.trim() || v.length > 300)) return { error: "Warehouse name, address, city, region and phone are required (up to 300 characters each)." };
  const lat = input.latitude.trim() ? Number(input.latitude) : null;
  const lng = input.longitude.trim() ? Number(input.longitude) : null;
  if ((lat === null) !== (lng === null) || (lat != null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) || (lng != null && (!Number.isFinite(lng) || Math.abs(lng) > 180))) return { error: "Enter a valid latitude and longitude together." };
  try {
    await prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.upsert({ where: { code: "LINKWE_MAIN" }, update: { name: input.name.trim(), isActive: true }, create: { code: "LINKWE_MAIN", name: input.name.trim() } });
      const addressData = { line1: input.line1.trim(), city: input.city.trim(), region: input.region.trim(), phone: input.phone.trim(), country: "TT", latitude: lat, longitude: lng };
      // Separate from personal addresses so editing the warehouse never changes a customer's address.
      const address = await tx.address.create({ data: addressData });
      await tx.warehouse.update({ where: { id: warehouse.id }, data: { addressId: address.id } });
    });
    revalidatePath("/dashboard/admin", "layout"); revalidatePath("/dashboard/vendor", "layout"); revalidatePath("/checkout");
    return { ok: true };
  } catch { return { error: "Could not save warehouse settings." }; }
}
