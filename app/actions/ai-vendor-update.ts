"use server"

import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { listingFieldGuide, validateVendorListingPatch, vendorListingFields, type VendorListingKind } from "@/lib/chat/vendor-listing-fields"

export type UpdateProductFromAIInput = { productId: string; expectedUpdatedAt?: string } & Record<string, unknown>

export async function getVendorListingFieldGuide(kind: VendorListingKind) {
  const session = await getSession()
  if (session?.role !== "VENDOR") throw new Error("Vendor access required.")
  if (kind !== "product" && kind !== "service") throw new Error("Choose product or service.")
  return listingFieldGuide(kind)
}

export async function searchVendorProducts(query: string) {
  const session = await getSession()
  if (session?.role !== "VENDOR") return []
  const store = await prisma.store.findFirst({ where: { ownerId: session.userId }, select: { id: true } })
  if (!store) return []
  return prisma.product.findMany({
    where: { storeId: store.id, name: { contains: query, mode: "insensitive" }, isArchived: false },
    select: { id: true, name: true, price: true, category: true, isPublished: true, isService: true, serviceType: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  })
}

export async function getVendorProductDetails(productId: string): Promise<Record<string, unknown> | null> {
  const session = await getSession()
  if (session?.role !== "VENDOR") return null
  const store = await prisma.store.findFirst({ where: { ownerId: session.userId }, select: { id: true } })
  if (!store) return null
  const select = Object.fromEntries([...vendorListingFields("product"), ...vendorListingFields("service")].map(field => [field.name, true])) as Prisma.ProductSelect
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
    select: { ...select, id: true, slug: true, isService: true, isDigital: true, hasVariants: true, isArchived: true, images: true, updatedAt: true },
  })
  if (!product) return null
  return { ...product, editableFields: listingFieldGuide(product.isService ? "service" : "product") }
}

export async function updateProductFromAI(input: UpdateProductFromAIInput, userId: string, storeId: string) {
  const session = await getSession()
  if (!session || session.role !== "VENDOR" || session.userId !== userId) return { ok: false as const, error: "Unauthorized" }
  if (!input || typeof input.productId !== "string" || !input.productId.trim()) return { ok: false as const, error: "Missing listing" }
  const { productId, expectedUpdatedAt, ...patch } = input
  try {
    const result = await prisma.$transaction(async tx => {
      const store = await tx.store.findFirst({ where: { id: storeId, ownerId: userId }, select: { id: true, slug: true, subscriptionPlan: true, subscriptionStatus: true } })
      if (!store) throw new Error("No store found")
      const current = await tx.product.findFirst({ where: { id: productId, storeId: store.id } })
      if (!current) throw new Error("Listing not found")
      if (expectedUpdatedAt !== undefined && (typeof expectedUpdatedAt !== "string" || expectedUpdatedAt !== current.updatedAt.toISOString())) throw new Error("This listing changed since it was read. Read its latest details before trying again.")
      const kind = current.isService ? "service" : "product"
      const changes = validateVendorListingPatch(kind, patch, current, store)
      const data = { ...changes, ...(Object.hasOwn(changes, "checkoutFields") && changes.checkoutFields == null ? { checkoutFields: Prisma.DbNull } : {}) } as Prisma.ProductUpdateManyMutationInput
      const saved = await tx.product.updateMany({ where: { id: current.id, storeId: store.id, updatedAt: current.updatedAt }, data })
      if (saved.count !== 1) throw new Error("This listing changed during the update. Read its latest details before trying again.")
      return { slug: current.slug, storeSlug: store.slug, kind, changes }
    })
    revalidatePath("/dashboard/vendor/creation", "layout")
    revalidatePath("/dashboard/vendor/products")
    revalidatePath("/dashboard/vendor/services")
    revalidatePath(`/dashboard/vendor/services/${productId}/availability`)
    revalidatePath(`/${result.kind === "service" ? "service" : "products"}/${result.slug}`)
    revalidatePath(`/store/${result.storeSlug}`)
    revalidatePath(result.kind === "service" ? "/services" : "/shop")
    return { ok: true as const, updatedFields: result.changes }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not update this listing." }
  }
}
