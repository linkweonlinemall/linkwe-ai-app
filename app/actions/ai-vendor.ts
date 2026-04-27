"use server"

import { revalidatePath } from "next/cache"
import type { ProductCondition, Prisma } from "@prisma/client"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

/** Same behavior as `sanitizeSlug` in `app/actions/product.ts` (not exported there). */
function sanitizeSlug(raw: string): string {
  let s = raw.trim().toLowerCase().replace(/\s+/g, "-")
  s = s.replace(/[^a-z0-9-]/g, "")
  s = s.replace(/-+/g, "-").replace(/^-+|-+$/g, "")
  return s
}

/** Same behavior as `uniqueProductSlug` in `app/actions/product.ts` (not exported there). */
async function uniqueProductSlug(
  base: string,
  excludeProductId?: string
): Promise<string> {
  let candidate = base || "product"
  let suffix = 2
  for (;;) {
    const clash = await prisma.product.findFirst({
      where: {
        slug: candidate,
        ...(excludeProductId ? { NOT: { id: excludeProductId } } : {}),
      },
      select: { id: true },
    })
    if (!clash) return candidate
    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

export type CreateProductFromAIInput = {
  name: string
  price: number
  condition: "NEW" | "USED" | "REFURBISHED"
  description?: string
  category?: string
  tags?: string[]
  stock?: number
  allowDelivery?: boolean
  allowPickup?: boolean
  brand?: string
  shortDescription?: string
  sku?: string
  weight?: number
  weightUnit?: "KG" | "LB"
  length?: number
  width?: number
  height?: number
  address?: string
  returnPolicy?: string
  isFeatured?: boolean
  metaTitle?: string
  metaDescription?: string
  compareAtPrice?: number
}

export async function createProductFromAI(
  input: CreateProductFromAIInput
): Promise<
  { ok: true; productId: string; slug: string } | { ok: false; error: string }
> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") {
    return { ok: false, error: "Unauthorized" }
  }

  const name = String(input.name ?? "").trim()
  if (!name) {
    return { ok: false, error: "Name is required." }
  }

  const price = Number(input.price)
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: "A valid price is required." }
  }

  const cond = input.condition
  if (!["NEW", "USED", "REFURBISHED"].includes(cond)) {
    return { ok: false, error: "Condition must be NEW, USED, or REFURBISHED." }
  }
  const condition = cond as ProductCondition

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  })
  if (!store) {
    return { ok: false, error: "No store found for your account." }
  }

  const baseSlug = sanitizeSlug(name) || "product"
  const slug = await uniqueProductSlug(baseSlug)

  const data: Prisma.ProductCreateInput = {
    store: { connect: { id: store.id } },
    name,
    slug,
    price,
    condition,
    description: input.description?.trim() || null,
    category: input.category?.trim() || null,
    brand: input.brand?.trim() || null,
    shortDescription: input.shortDescription?.trim() || null,
    tags: Array.isArray(input.tags) ? input.tags.map((t) => String(t).trim()).filter(Boolean) : [],
    stock:
      input.stock != null && Number.isFinite(Number(input.stock))
        ? Math.floor(Number(input.stock))
        : null,
    allowDelivery: Boolean(input.allowDelivery),
    allowPickup: Boolean(input.allowPickup),
    sku: typeof input.sku === "string" && input.sku.trim() ? input.sku.trim() : null,
    weight: input.weight != null && Number.isFinite(Number(input.weight)) ? Number(input.weight) : null,
    weightUnit: input.weightUnit === "KG" || input.weightUnit === "LB" ? input.weightUnit : null,
    length: input.length != null && Number.isFinite(Number(input.length)) ? Number(input.length) : null,
    width: input.width != null && Number.isFinite(Number(input.width)) ? Number(input.width) : null,
    height: input.height != null && Number.isFinite(Number(input.height)) ? Number(input.height) : null,
    address: typeof input.address === "string" && input.address.trim() ? input.address.trim() : null,
    returnPolicy: typeof input.returnPolicy === "string" && input.returnPolicy.trim() ? input.returnPolicy.trim() : null,
    isFeatured: input.isFeatured === true,
    metaTitle: typeof input.metaTitle === "string" && input.metaTitle.trim() ? input.metaTitle.trim() : null,
    metaDescription: typeof input.metaDescription === "string" && input.metaDescription.trim() ? input.metaDescription.trim() : null,
    compareAtPrice: input.compareAtPrice != null && Number.isFinite(Number(input.compareAtPrice)) ? Number(input.compareAtPrice) : null,
    images: [],
    isPublished: false,
    isDigital: false,
    isBookable: false,
  }

  try {
    const product = await prisma.product.create({ data, select: { id: true, slug: true } })
    revalidatePath("/dashboard/vendor/products")
    return { ok: true, productId: product.id, slug: product.slug }
  } catch (e) {
    console.error("createProductFromAI", e)
    return { ok: false, error: "Could not save the product. Try again." }
  }
}

export async function createProductFromAIRaw(
  input: CreateProductFromAIInput,
  userId: string,
  storeId: string
): Promise<
  { ok: true; productId: string; slug: string } | { ok: false; error: string }
> {
  const name = String(input.name ?? "").trim()
  if (!name) return { ok: false, error: "Name is required." }

  const price = Number(input.price)
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: "A valid price is required." }
  }

  const validConditions = ["NEW", "USED", "REFURBISHED"]
  if (!validConditions.includes(input.condition)) {
    return { ok: false, error: "Invalid condition." }
  }

  const condition = input.condition as import("@prisma/client").ProductCondition

  const baseSlug = sanitizeSlug(name) || "product"
  const slug = await uniqueProductSlug(baseSlug)

  console.log(
    "createProductFromAIRaw saving:",
    JSON.stringify({
      sku: input.sku,
      weight: input.weight,
      metaTitle: input.metaTitle,
      isFeatured: input.isFeatured,
      address: input.address,
    })
  )

  const product = await prisma.product.create({
    data: {
      store: { connect: { id: storeId } },
      name,
      slug,
      price,
      condition,
      description: input.description?.trim() || null,
      shortDescription: input.shortDescription?.trim() || null,
      category: input.category?.trim() || null,
      brand: input.brand?.trim() || null,
      tags: Array.isArray(input.tags)
        ? input.tags.map((t) => String(t).trim()).filter(Boolean)
        : [],
      stock:
        input.stock != null && Number.isFinite(Number(input.stock))
          ? Math.floor(Number(input.stock))
          : null,
      allowDelivery: Boolean(input.allowDelivery),
      allowPickup: Boolean(input.allowPickup),
      address: typeof input.address === "string" && input.address.trim() ? input.address.trim() : null,
      sku: typeof input.sku === "string" && input.sku.trim() ? input.sku.trim() : null,
      weight: input.weight != null && Number.isFinite(Number(input.weight)) ? Number(input.weight) : null,
      weightUnit: input.weightUnit === "KG" || input.weightUnit === "LB" ? input.weightUnit : null,
      length: input.length != null && Number.isFinite(Number(input.length)) ? Number(input.length) : null,
      width: input.width != null && Number.isFinite(Number(input.width)) ? Number(input.width) : null,
      height: input.height != null && Number.isFinite(Number(input.height)) ? Number(input.height) : null,
      returnPolicy: typeof input.returnPolicy === "string" && input.returnPolicy.trim() ? input.returnPolicy.trim() : null,
      isFeatured: input.isFeatured === true,
      metaTitle: typeof input.metaTitle === "string" && input.metaTitle.trim() ? input.metaTitle.trim() : null,
      metaDescription: typeof input.metaDescription === "string" && input.metaDescription.trim() ? input.metaDescription.trim() : null,
      compareAtPrice: input.compareAtPrice != null && Number.isFinite(Number(input.compareAtPrice)) ? Number(input.compareAtPrice) : null,
      images: [],
      isPublished: false,
      isDigital: false,
      isBookable: false,
    },
    select: { id: true, slug: true },
  })

  revalidatePath("/dashboard/vendor/products")
  return { ok: true, productId: product.id, slug: product.slug }
}

export async function assertVendorSession(): Promise<{ ok: true } | { ok: false }> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") {
    return { ok: false }
  }
  return { ok: true }
}

export async function generateCSVTemplate(): Promise<string> {
  const headers = [
    "name",
    "price",
    "condition",
    "description",
    "shortDescription",
    "category",
    "brand",
    "sku",
    "stock",
    "tags",
    "allowDelivery",
    "allowPickup",
    "weight",
    "weightUnit",
    "length",
    "width",
    "height",
    "address",
    "returnPolicy",
    "isFeatured",
    "metaTitle",
    "metaDescription",
  ]

  const example = [
    "Blue Cotton T-Shirt",
    "150",
    "NEW",
    "A comfortable everyday cotton t-shirt available in multiple sizes.",
    "Soft blue cotton tee",
    "clothing",
    "MyBrand",
    "SKU-001",
    "25",
    "blue,cotton,mens,casual",
    "true",
    "false",
    "0.3",
    "KG",
    "30",
    "25",
    "2",
    "10 Independence Square, Port of Spain",
    "Returns accepted within 7 days",
    "false",
    "Blue Cotton T-Shirt | MyStore LinkWe",
    "Shop our soft blue cotton t-shirt. Delivered across Trinidad and Tobago.",
  ]

  return [headers.join(","), example.join(",")].join("\n")
}

export async function generateXLSXTemplate(): Promise<Uint8Array> {
  const ExcelJS = (await import("exceljs")).default
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Products")

  const columns = [
    { header: "name", key: "name", width: 30 },
    { header: "price", key: "price", width: 12 },
    { header: "condition", key: "condition", width: 15 },
    { header: "description", key: "description", width: 40 },
    { header: "shortDescription", key: "shortDescription", width: 30 },
    { header: "category", key: "category", width: 20 },
    { header: "brand", key: "brand", width: 15 },
    { header: "sku", key: "sku", width: 15 },
    { header: "stock", key: "stock", width: 10 },
    { header: "tags", key: "tags", width: 30 },
    { header: "allowDelivery", key: "allowDelivery", width: 15 },
    { header: "allowPickup", key: "allowPickup", width: 15 },
    { header: "weight", key: "weight", width: 10 },
    { header: "weightUnit", key: "weightUnit", width: 12 },
    { header: "length", key: "length", width: 10 },
    { header: "width", key: "width", width: 10 },
    { header: "height", key: "height", width: 10 },
    { header: "returnPolicy", key: "returnPolicy", width: 30 },
    { header: "isFeatured", key: "isFeatured", width: 12 },
    { header: "metaTitle", key: "metaTitle", width: 30 },
    { header: "metaDescription", key: "metaDescription", width: 40 },
  ]

  sheet.columns = columns

  // Style header row
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD4450A" },
  }
  headerRow.alignment = { vertical: "middle", horizontal: "center" }
  headerRow.height = 24

  // Add example row
  sheet.addRow({
    name: "Blue Cotton T-Shirt",
    price: 150,
    condition: "NEW",
    description: "A comfortable everyday cotton t-shirt",
    shortDescription: "Soft blue cotton tee",
    category: "clothing_apparel",
    brand: "MyBrand",
    sku: "SKU-001",
    stock: 25,
    tags: "blue,cotton,mens,casual",
    allowDelivery: "true",
    allowPickup: "false",
    weight: 0.3,
    weightUnit: "KG",
    length: 30,
    width: 25,
    height: 2,
    returnPolicy: "Returns accepted within 7 days",
    isFeatured: "false",
    metaTitle: "Blue Cotton T-Shirt | MyStore",
    metaDescription:
      "Shop our soft blue cotton t-shirt. Delivered across Trinidad and Tobago.",
  })

  // Data validation — dropdowns
  const categoryList =
    '"clothing_apparel,shoes_footwear,jewellery_watches,health_beauty,food_beverages,home_furniture,electronics,sports_fitness,toys_games,books_stationery,art_crafts,automotive_parts"'
  const conditionList = '"NEW,USED,REFURBISHED"'
  const boolList = '"true,false"'
  const weightUnitList = '"KG,LB"'

  for (let row = 2; row <= 100; row++) {
    sheet.getCell(`C${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [conditionList],
    }
    sheet.getCell(`F${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [categoryList],
    }
    sheet.getCell(`I${row}`).dataValidation = {
      type: "decimal",
      allowBlank: true,
      operator: "greaterThanOrEqual",
      formulae: [0],
      showErrorMessage: true,
      errorTitle: "Invalid",
      error: "Must be a number",
    }
    sheet.getCell(`K${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [boolList],
    }
    sheet.getCell(`L${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [boolList],
    }
    sheet.getCell(`M${row}`).dataValidation = {
      type: "decimal",
      allowBlank: true,
      operator: "greaterThanOrEqual",
      formulae: [0],
      showErrorMessage: true,
      errorTitle: "Invalid",
      error: "Must be a number",
    }
    sheet.getCell(`N${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [weightUnitList],
    }
    sheet.getCell(`O${row}`).dataValidation = {
      type: "decimal",
      allowBlank: true,
      operator: "greaterThanOrEqual",
      formulae: [0],
      showErrorMessage: true,
      errorTitle: "Invalid",
      error: "Must be a number",
    }
    sheet.getCell(`P${row}`).dataValidation = {
      type: "decimal",
      allowBlank: true,
      operator: "greaterThanOrEqual",
      formulae: [0],
      showErrorMessage: true,
      errorTitle: "Invalid",
      error: "Must be a number",
    }
    sheet.getCell(`Q${row}`).dataValidation = {
      type: "decimal",
      allowBlank: true,
      operator: "greaterThanOrEqual",
      formulae: [0],
      showErrorMessage: true,
      errorTitle: "Invalid",
      error: "Must be a number",
    }
    sheet.getCell(`S${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [boolList],
    }
  }

  const out = await workbook.xlsx.writeBuffer()
  if (out instanceof ArrayBuffer) return new Uint8Array(out)
  if (Buffer.isBuffer(out)) return new Uint8Array(out)
  return new Uint8Array(out as ArrayBuffer)
}
