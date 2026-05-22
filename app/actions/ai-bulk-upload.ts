"use server"

import type { ProductCondition, ServiceType, WeightUnit } from "@prisma/client"
import ExcelJS from "exceljs"
import { parse } from "csv-parse/sync"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

type CSVRow = Record<string, string>

type FailedRow = { row: number; name: string; error: string }

export type BulkResult = {
  total: number
  created: number
  failed: FailedRow[]
  createdProducts: { productId: string; name: string; type: string }[]
}

export type ProductType = "simple" | "variable" | "service" | "digital"

function sanitizeSlug(raw: string): string {
  let s = raw.trim().toLowerCase().replace(/\s+/g, "-")
  s = s.replace(/[^a-z0-9-]/g, "")
  s = s.replace(/-+/g, "-").replace(/^-+|-+$/g, "")
  return s
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || "product"
  let suffix = 0
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!existing) return candidate
    suffix++
  }
}

async function parseRows(file: File): Promise<CSVRow[] | null> {
  const fileName = file.name.toLowerCase()
  if (fileName.endsWith(".xlsx")) {
    try {
      const workbook = new ExcelJS.Workbook()
      const arrayBuffer = await file.arrayBuffer()
      await workbook.xlsx.load(arrayBuffer)
      const worksheet = workbook.worksheets[0]
      if (!worksheet) return null
      const headers: string[] = []
      worksheet.getRow(1).eachCell((cell) => {
        headers.push(String(cell.value ?? "").trim())
      })
      const rows: CSVRow[] = []
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        const obj: CSVRow = {}
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1]
          if (header) obj[header] = String(cell.value ?? "").trim()
        })
        if (Object.values(obj).some((v) => v)) rows.push(obj)
      })
      return rows
    } catch {
      return null
    }
  }
  const text = await file.text()
  try {
    return parse(text, { columns: true, skip_empty_lines: true, trim: true })
  } catch {
    return null
  }
}

export async function bulkUploadFromCSV(
  formData: FormData,
  productType: ProductType = "simple",
  publishImmediately: boolean = false
): Promise<BulkResult> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") {
    return {
      total: 0,
      created: 0,
      failed: [{ row: 0, name: "", error: "Unauthorized" }],
      createdProducts: [],
    }
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  })
  if (!store) {
    return {
      total: 0,
      created: 0,
      failed: [{ row: 0, name: "", error: "No store found" }],
      createdProducts: [],
    }
  }

  const file = formData.get("csv")
  if (!(file instanceof File) || file.size === 0) {
    return {
      total: 0,
      created: 0,
      failed: [{ row: 0, name: "", error: "No file provided" }],
      createdProducts: [],
    }
  }

  const rows = await parseRows(file)
  if (!rows) {
    return {
      total: 0,
      created: 0,
      failed: [{ row: 0, name: "", error: "Invalid file format" }],
      createdProducts: [],
    }
  }

  const result: BulkResult = {
    total: rows.length,
    created: 0,
    failed: [],
    createdProducts: [],
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    const rowNum = i + 2
    const name = row["name"]?.trim() ?? ""
    if (!name) {
      result.failed.push({ row: rowNum, name: "", error: "Missing name" })
      continue
    }

    const price = parseFloat(row["price"] ?? "")
    if (!Number.isFinite(price) || price <= 0) {
      result.failed.push({ row: rowNum, name, error: "Invalid price" })
      continue
    }

    const conditionRaw = row["condition"]?.trim().toUpperCase()
    const validConditions: ProductCondition[] = ["NEW", "USED", "REFURBISHED"]
    const condition: ProductCondition = validConditions.includes(
      conditionRaw as ProductCondition
    )
      ? (conditionRaw as ProductCondition)
      : "NEW"

    const weightUnitRaw = row["weightUnit"]?.trim().toUpperCase()
    const weightUnit: WeightUnit | null =
      weightUnitRaw === "KG" || weightUnitRaw === "LB" ? weightUnitRaw : null

    const tags = row["tags"]
      ? row["tags"].split(",").map((t) => t.trim()).filter(Boolean)
      : []

    const baseSlug = sanitizeSlug(name) || "product"
    const slug = await uniqueSlug(baseSlug)

    const isDigital = productType === "digital"
    const isBookable = productType === "service"
    const hasVariants = productType === "variable"

    try {
      const product = await prisma.product.create({
        data: {
          storeId: store.id,
          name,
          slug,
          price,
          condition,
          description: row["description"]?.trim() || null,
          shortDescription: row["shortDescription"]?.trim() || null,
          category: row["category"]?.trim() || null,
          brand: row["brand"]?.trim() || null,
          sku: row["sku"]?.trim() || null,
          stock:
            isBookable || isDigital ? null : parseInt(row["stock"] ?? "", 10) || null,
          tags,
          allowDelivery:
            isDigital ? false : row["allowDelivery"]?.trim().toLowerCase() === "true",
          allowPickup:
            isBookable ? true : row["allowPickup"]?.trim().toLowerCase() === "true",
          weight: parseFloat(row["weight"] ?? "") || null,
          weightUnit,
          length: parseFloat(row["length"] ?? "") || null,
          width: parseFloat(row["width"] ?? "") || null,
          height: parseFloat(row["height"] ?? "") || null,
          returnPolicy: row["returnPolicy"]?.trim() || null,
          isFeatured: row["isFeatured"]?.trim().toLowerCase() === "true",
          metaTitle: row["metaTitle"]?.trim() || null,
          metaDescription: row["metaDescription"]?.trim() || null,
          isPublished: publishImmediately,
          isDigital,
          isBookable,
          hasVariants,
          ...(productType === "service"
            ? {
                isService: true,
                serviceType: "BOOKABLE" as ServiceType,
              }
            : {}),
          images: [],
        },
        select: { id: true },
      })

      if (productType === "variable" && row["variants"]) {
        const variantPairs = row["variants"]
          .split("|")
          .map((v) => v.trim())
          .filter(Boolean)
        for (const pair of variantPairs) {
          const parts = pair.split(":").map((p) => p.trim())
          const variantName = parts[0] ?? ""
          const variantPrice = parseFloat(parts[1] ?? "") || price
          const variantStock = parseInt(parts[2] ?? "", 10) || 0
          if (variantName) {
            await prisma.productVariant.create({
              data: {
                productId: product.id,
                name: variantName,
                price: variantPrice,
                stock: variantStock,
                images: [],
                attributes: [],
              },
            })
          }
        }
      }

      result.created++
      result.createdProducts.push({ productId: product.id, name, type: productType })
    } catch (e) {
      result.failed.push({ row: rowNum, name, error: "Database error" })
      console.error(e)
    }
  }

  return result
}

export async function generateBulkTemplate(
  productType: ProductType
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Products")

  const baseColumns = [
    "name",
    "price",
    "description",
    "shortDescription",
    "category",
    "brand",
    "tags",
    "condition",
    "returnPolicy",
    "isFeatured",
  ]
  const simpleExtra = [
    "stock",
    "sku",
    "allowDelivery",
    "allowPickup",
    "weight",
    "weightUnit",
  ]
  const variableExtra = [
    "variants",
    "sku",
    "allowDelivery",
    "allowPickup",
    "weight",
    "weightUnit",
  ]
  const serviceExtra = ["sku"]
  const digitalExtra = ["sku"]

  const columnMap: Record<ProductType, string[]> = {
    simple: [...baseColumns, ...simpleExtra],
    variable: [...baseColumns, ...variableExtra],
    service: [...baseColumns, ...serviceExtra],
    digital: [...baseColumns, ...digitalExtra],
  }

  const columns = columnMap[productType]

  const exampleMap: Record<ProductType, string[]> = {
    simple: [
      "Red Sneakers",
      "250",
      "Great everyday sneaker",
      "Comfy and stylish",
      "Footwear",
      "Nike",
      "shoes,sneakers",
      "NEW",
      "No returns",
      "false",
      "10",
      "SKU001",
      "true",
      "true",
      "0.5",
      "KG",
    ],
    variable: [
      "Custom T-Shirt",
      "150",
      "Bold graphic tee",
      "Statement piece",
      "Clothing Apparel",
      "Bad Dawg",
      "tee,clothing",
      "NEW",
      "7 day returns",
      "false",
      "S:150:20|M:150:15|L:160:10",
      "SKU002",
      "true",
      "true",
      "0.3",
      "KG",
    ],
    service: [
      "Haircut",
      "200",
      "Professional haircut service",
      "Fresh cut guaranteed",
      "Beauty",
      "My Salon",
      "haircut,grooming",
      "NEW",
      "No refunds",
      "false",
      "SKU003",
    ],
    digital: [
      "Logo Design Pack",
      "500",
      "Professional logo files",
      "PNG SVG AI formats included",
      "Design",
      "CreativeStudio",
      "logo,design,digital",
      "NEW",
      "No refunds",
      "false",
      "SKU004",
    ],
  }

  const hintMap: Record<ProductType, string[]> = {
    simple: [
      "Product name",
      "Price in TTD",
      "Full description",
      "Short description",
      "Category",
      "Brand",
      "Comma separated tags",
      "NEW/USED/REFURBISHED",
      "Return policy text",
      "true/false",
      "Stock quantity",
      "SKU code",
      "true/false",
      "true/false",
      "Weight number",
      "KG or LB",
    ],
    variable: [
      "Product name",
      "Price in TTD",
      "Full description",
      "Short description",
      "Category",
      "Brand",
      "Comma separated tags",
      "NEW/USED/REFURBISHED",
      "Return policy text",
      "true/false",
      "Name:Price:Stock separated by | e.g. S:150:20|M:150:15",
      "SKU code",
      "true/false",
      "true/false",
      "Weight number",
      "KG or LB",
    ],
    service: [
      "Service name",
      "Price in TTD",
      "Full description",
      "Short description",
      "Category",
      "Brand/Business",
      "Comma separated tags",
      "NEW",
      "Refund policy",
      "true/false",
      "SKU code",
    ],
    digital: [
      "Product name",
      "Price in TTD",
      "Full description",
      "Short description",
      "Category",
      "Creator/Brand",
      "Comma separated tags",
      "NEW",
      "Refund policy",
      "true/false",
      "SKU code",
    ],
  }

  worksheet.addRow(columns)
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD4450A" },
  }
  worksheet.addRow(hintMap[productType])
  const hintRow = worksheet.getRow(2)
  hintRow.font = { italic: true, color: { argb: "FF888888" } }
  worksheet.addRow(exampleMap[productType])
  const exampleRow = worksheet.getRow(3)
  exampleRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF5F0" },
  }

  for (let i = 1; i <= columns.length; i++) {
    const col = worksheet.getColumn(i)
    col.width = 22
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Uint8Array(buffer as ArrayBuffer)
}
