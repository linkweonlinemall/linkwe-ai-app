"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function getVendorServices() {
  const session = await getSession();
  if (!session) return [];
  const store = await prisma.store.findFirst({ where: { ownerId: session.userId } });
  if (!store) return [];
  return prisma.product.findMany({
    where: { storeId: store.id, isService: true },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      isPublished: true,
      serviceType: true,
      serviceLocation: true,
      serviceDuration: true,
      category: true,
      images: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createService(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({ where: { ownerId: session.userId } });
  if (!store) return { error: "No store found" };

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const categoryRaw = (formData.get("category") as string) || "";
  const category = categoryRaw.trim() || null;
  const serviceType = formData.get("serviceType") as string;
  const serviceLocationRaw = (formData.get("serviceLocation") as string) || "";
  const price = parseFloat(formData.get("price") as string);
  const serviceDuration = formData.get("serviceDuration")
    ? parseInt(formData.get("serviceDuration") as string, 10)
    : null;
  const requiresDeposit = formData.get("requiresDeposit") === "true";
  const depositAmount = requiresDeposit && formData.get("depositAmount")
    ? parseFloat(formData.get("depositAmount") as string)
    : null;
  const isPublished = formData.get("isPublished") === "true";
  const tagsRaw = formData.get("tags") as string;
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  if (!name || !serviceType || Number.isNaN(price)) return { error: "Missing required fields" };

  let slug = slugify(name);
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  await prisma.product.create({
    data: {
      storeId: store.id,
      name,
      slug,
      description,
      category,
      price,
      isService: true,
      serviceType: serviceType as any,
      serviceLocation:
        serviceLocationRaw.trim().length > 0 ? (serviceLocationRaw.trim() as any) : null,
      serviceDuration: serviceDuration && !Number.isNaN(serviceDuration) ? serviceDuration : null,
      requiresDeposit,
      depositAmount:
        depositAmount !== null && !Number.isNaN(depositAmount) ? depositAmount : null,
      isPublished,
      tags,
      images: [],
    },
  });

  revalidatePath("/dashboard/vendor/services");
  return { ok: true };
}

export async function updateService(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({ where: { ownerId: session.userId } });
  if (!store) return { error: "No store found" };

  const existing = await prisma.product.findFirst({
    where: { id, storeId: store.id, isService: true },
    select: { slug: true },
  });
  if (!existing) return { error: "Not found" };

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const categoryRaw = (formData.get("category") as string) || "";
  const category = categoryRaw.trim() || null;
  const serviceType = formData.get("serviceType") as string;
  const serviceLocationRaw = (formData.get("serviceLocation") as string) || "";
  const price = parseFloat(formData.get("price") as string);
  const serviceDuration = formData.get("serviceDuration")
    ? parseInt(formData.get("serviceDuration") as string, 10)
    : null;
  const requiresDeposit = formData.get("requiresDeposit") === "true";
  const depositAmount = requiresDeposit && formData.get("depositAmount")
    ? parseFloat(formData.get("depositAmount") as string)
    : null;
  const isPublished = formData.get("isPublished") === "true";
  const tagsRaw = formData.get("tags") as string;
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  await prisma.product.update({
    where: { id },
    data: {
      name,
      description,
      category,
      price,
      serviceType: serviceType as any,
      serviceLocation:
        serviceLocationRaw.trim().length > 0 ? (serviceLocationRaw.trim() as any) : null,
      serviceDuration: serviceDuration && !Number.isNaN(serviceDuration) ? serviceDuration : null,
      requiresDeposit,
      depositAmount:
        depositAmount !== null && !Number.isNaN(depositAmount) ? depositAmount : null,
      isPublished,
      tags,
    },
  });

  revalidatePath("/dashboard/vendor/services");
  revalidatePath(`/service/${existing.slug}`);
  return { ok: true };
}

export async function deleteService(id: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({ where: { ownerId: session.userId } });
  if (!store) return { error: "No store found" };

  const exists = await prisma.product.findFirst({
    where: { id, storeId: store.id, isService: true },
  });
  if (!exists) return { error: "Not found" };

  await prisma.product.update({
    where: { id },
    data: { isPublished: false, isArchived: true },
  });
  revalidatePath("/dashboard/vendor/services");
  return { ok: true };
}

export async function getPublicServices(
  filters: {
    category?: string;
    serviceType?: string;
    q?: string;
    sort?: string;
  } = {},
) {
  const { category, serviceType, q, sort } = filters;
  const orderBy =
    sort === "price_asc"
      ? [{ price: "asc" as const }]
      : sort === "price_desc"
        ? [{ price: "desc" as const }]
        : sort === "newest"
          ? [{ createdAt: "desc" as const }]
          : [{ isFeatured: "desc" as const }, { createdAt: "desc" as const }];

  return prisma.product.findMany({
    where: {
      isPublished: true,
      isService: true,
      isArchived: false,
      ...(category ? { category } : {}),
      ...(serviceType ? { serviceType: serviceType as any } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { tags: { has: q.toLowerCase() } },
              { store: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      compareAtPrice: true,
      images: true,
      category: true,
      serviceType: true,
      serviceLocation: true,
      serviceDuration: true,
      isFeatured: true,
      requiresDeposit: true,
      depositAmount: true,
      store: { select: { name: true, slug: true, region: true, logoUrl: true } },
    },
    orderBy,
    take: 60,
  });
}
