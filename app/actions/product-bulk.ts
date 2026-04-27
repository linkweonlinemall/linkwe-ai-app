"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

const PRODUCTS_PATH = "/dashboard/vendor/products"

async function getVendorStoreId(userId: string): Promise<string | null> {
  const store = await prisma.store.findFirst({
    where: { ownerId: userId },
    select: { id: true }
  })
  return store?.id ?? null
}

export async function bulkPublish(
  productIds: string[],
  publish: boolean
): Promise<{ ok: boolean }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") return { ok: false }
  const storeId = await getVendorStoreId(session.userId)
  if (!storeId) return { ok: false }
  await prisma.product.updateMany({
    where: { id: { in: productIds }, storeId },
    data: { isPublished: publish }
  })
  revalidatePath(PRODUCTS_PATH)
  return { ok: true }
}

export async function bulkDelete(
  productIds: string[]
): Promise<{ ok: boolean }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") return { ok: false }
  const storeId = await getVendorStoreId(session.userId)
  if (!storeId) return { ok: false }
  await prisma.product.deleteMany({
    where: { id: { in: productIds }, storeId }
  })
  revalidatePath(PRODUCTS_PATH)
  return { ok: true }
}

export async function bulkAddStock(
  productIds: string[],
  quantity: number
): Promise<{ ok: boolean }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") return { ok: false }
  const storeId = await getVendorStoreId(session.userId)
  if (!storeId) return { ok: false }
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, storeId },
    select: { id: true, stock: true }
  })
  await Promise.all(products.map(p =>
    prisma.product.update({
      where: { id: p.id },
      data: { stock: (p.stock ?? 0) + quantity }
    })
  ))
  revalidatePath(PRODUCTS_PATH)
  return { ok: true }
}

export async function bulkFeature(
  productIds: string[],
  featured: boolean
): Promise<{ ok: boolean }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") return { ok: false }
  const storeId = await getVendorStoreId(session.userId)
  if (!storeId) return { ok: false }
  await prisma.product.updateMany({
    where: { id: { in: productIds }, storeId },
    data: { isFeatured: featured }
  })
  revalidatePath(PRODUCTS_PATH)
  return { ok: true }
}

export async function bulkChangeCategory(
  productIds: string[],
  category: string
): Promise<{ ok: boolean }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") return { ok: false }
  const storeId = await getVendorStoreId(session.userId)
  if (!storeId) return { ok: false }
  await prisma.product.updateMany({
    where: { id: { in: productIds }, storeId },
    data: { category }
  })
  revalidatePath(PRODUCTS_PATH)
  return { ok: true }
}

export type VendorProductListItem = {
  id: string
  name: string
  price: number
  stock: number | null
  images: string[]
  isPublished: boolean
  isFeatured: boolean
  category: string | null
}

export async function getVendorProductsList(): Promise<VendorProductListItem[]> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") {
    redirect("/login")
  }
  const storeId = await getVendorStoreId(session.userId)
  if (!storeId) {
    redirect("/onboarding/business/step-3")
  }
  return prisma.product.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      images: true,
      isPublished: true,
      isFeatured: true,
      category: true,
    },
  })
}
