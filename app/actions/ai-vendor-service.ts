"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getStorePlan } from "@/lib/finance/store-plan";
import { isTrustedHostedImageUrl } from "@/lib/images/trusted-host";
import { validateVendorListingPatch, vendorListingFields } from "@/lib/chat/vendor-listing-fields";

export async function createServiceFromAI(patch: Record<string, unknown>, images: string[] = []) {
  const actor = await getSession();
  if (actor?.role !== "VENDOR") return { ok: false as const, error: "Vendor access required." };
  if (!Array.isArray(images) || images.length > 10 || images.some(image => typeof image !== "string" || !isTrustedHostedImageUrl(image))) return { ok: false as const, error: "Use up to 10 uploaded service photos." };
  try {
    const result = await prisma.$transaction(async tx => {
      const store = await tx.store.findFirst({ where: { ownerId: actor.userId } });
      if (!store) throw new Error("No store found.");
      await tx.$queryRaw`SELECT id FROM stores WHERE id = ${store.id} FOR UPDATE`;
      const currentStore = await tx.store.findUniqueOrThrow({ where: { id: store.id } });
      const { limits } = getStorePlan(currentStore);
      if (limits.serviceCap !== null && await tx.product.count({ where: { storeId: store.id, isService: true, isArchived: false } }) >= limits.serviceCap) throw new Error(`Your plan includes up to ${limits.serviceCap} services. Archive an old service or upgrade to create more.`);
      const defaults = Object.fromEntries(vendorListingFields("service").map(field => [field.name, field.value]));
      const data = validateVendorListingPatch("service", patch, defaults, currentStore);
      if (typeof data.name !== "string" || !data.name.trim() || !data.serviceType || data.price == null) throw new Error("Name, price and service type are required.");
      const base = data.name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-") || "service";
      const slug = `${base}-${randomUUID().slice(0, 8)}`;
      const service = await tx.product.create({ data: {
        ...data, storeId: store.id, slug, isService: true, images,
        tags: data.tags ?? [], isPublished: data.isPublished === true,
        ...(data.checkoutFields == null ? { checkoutFields: Prisma.DbNull } : {}),
      } as Prisma.ProductUncheckedCreateInput });
      return { serviceId: service.id, slug, storeSlug: store.slug, isPublished: service.isPublished };
    });
    revalidatePath("/dashboard/vendor/creation", "layout");
    revalidatePath("/dashboard/vendor/services");
    revalidatePath("/services");
    revalidatePath(`/service/${result.slug}`);
    revalidatePath(`/store/${result.storeSlug}`);
    return { ok: true as const, serviceId: result.serviceId, slug: result.slug, isPublished: result.isPublished };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not create service." };
  }
}
