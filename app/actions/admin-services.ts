"use server";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { ServiceType } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
async function admin() { const s = await getSession(); if (s?.role !== "ADMIN") throw new Error("Administrator access required."); return s; }
export async function createAdminService(input: { storeId: string; name: string; type: string }) {
  await admin();
  if (!input.name.trim() || input.name.length > 150 || !Object.values(ServiceType).includes(input.type as ServiceType)) return { error: "Enter a name and service type." };
  try {
    const store = await prisma.store.findUnique({ where: { id: input.storeId }, select: { id: true } });
    if (!store) return { error: "Choose a store." };
    const row = await prisma.product.create({ data: { storeId: store.id, name: input.name.trim(), slug: `service-${randomUUID()}`, isService: true, serviceType: input.type as ServiceType, isBookable: ["BOOKABLE", "VIRTUAL"].includes(input.type), tags: [], images: [] }, select: { id: true } });
    revalidatePath("/dashboard/admin/services"); return { id: row.id };
  } catch { return { error: "Could not create service." }; }
}
export async function manageAdminService(id: string, action: "archive" | "restore" | "delete") {
  const actor = await admin();
  if (!["archive", "restore", "delete"].includes(action)) return { error: "Choose a valid action." };
  try {
    await prisma.$transaction(async tx => {
      const row = await tx.product.findUniqueOrThrow({ where: { id, isService: true }, select: { name: true, _count: { select: { bookings: true, onDemandRequests: true, customerServiceSubscriptions: true, orderItems: true } } } });
      if (action === "delete") {
        if (Object.values(row._count).some(n => n > 0)) throw new Error("This service has customer history. Archive it to preserve bookings and payments.");
        await tx.product.delete({ where: { id } });
      } else await tx.product.update({ where: { id }, data: { isArchived: action === "archive", isPublished: false } });
      await tx.notification.create({ data: { userId: actor.userId, type: "GENERAL", title: `Service ${action}`, body: `${row.name} · ${actor.fullName}`, linkUrl: "/dashboard/admin/services" } });
    });
    revalidatePath("/", "layout"); return { ok: true };
  } catch(e) { return { error: e instanceof Error ? e.message : "Could not update service." }; }
}
