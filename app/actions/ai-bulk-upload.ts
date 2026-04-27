"use server"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { parse } from "csv-parse/sync"
import type { ProductCondition, WeightUnit } from "@prisma/client"

type CSVRow = Record<string, string>

type BulkResult = {
  total: number
  created: number
  failed: { row: number; name: string; error: string }[]
  createdProducts: { productId: string; name: string }[]
}

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
    const existing = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!existing) return candidate
    suffix++
  }
}

export async function bulkUploadFromCSV(
  formData: FormData
): Promise<BulkResult> {
  const session = await getSession()
  if (!session || session.role !== "VENDOR") {
    return { total: 0, created: 0, failed: [{ row: 0, name: "", error: "Unauthorized" }], createdProducts: [] }
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  })
  if (!store) {
    return { total: 0, created: 0, failed: [{ row: 0, name: "", error: "No store found" }], createdProducts: [] }
  }

  const file = formData.get("csv")
  if (!(file instanceof File) || file.size === 0) {
    return { total: 0, created: 0, failed: [{ row: 0, name: "", error: "No file provided" }], createdProducts: [] }
  }

  const fileName = file.name.toLowerCase()
  let rows: CSVRow[]

  if (fileName.endsWith(".xlsx")) {
    try {
      const ExcelJS = (await import("exceljs")).default
      const workbook = new ExcelJS.Workbook()
      const arrayBuffer = await file.arrayBuffer()
      await workbook.xlsx.load(arrayBuffer)
      const worksheet = workbook.worksheets[0]
      if (!worksheet) throw new Error("No worksheet found")
      const headers: string[] = []
      worksheet.getRow(1).eachCell((cell) => {
        headers.push(String(cell.value ?? "").trim())
      })
      rows = []
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        const obj: CSVRow = {}
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1]
          if (header) obj[header] = String(cell.value ?? "").trim()
        })
        if (Object.values(obj).some((v) => v)) rows.push(obj)
      })
    } catch {
      return {
        total: 0,
        created: 0,
        failed: [{ row: 0, name: "", error: "Invalid XLSX format" }],
        createdProducts: [],
      }
    }
  } else {
    const text = await file.text()
    try {
      rows = parse(text, { columns: true, skip_empty_lines: true, trim: true })
    } catch {
      return {
        total: 0,
        created: 0,
        failed: [{ row: 0, name: "", error: "Invalid CSV format" }],
        createdProducts: [],
      }
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
    const price = parseFloat(row["price"] ?? "")

    if (!name) {
      result.failed.push({ row: rowNum, name: "", error: "Missing name" })
      continue
    }
    if (!Number.isFinite(price) || price <= 0) {
      result.failed.push({ row: rowNum, name, error: "Invalid price" })
      continue
    }

    const conditionRaw = row["condition"]?.trim().toUpperCase()
    const validConditions: ProductCondition[] = ["NEW", "USED", "REFURBISHED"]
    const condition: ProductCondition = validConditions.includes(conditionRaw as ProductCondition)
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
          stock: parseInt(row["stock"] ?? "") || null,
          tags,
          allowDelivery: row["allowDelivery"]?.trim().toLowerCase() === "true",
          allowPickup: row["allowPickup"]?.trim().toLowerCase() === "true",
          weight: parseFloat(row["weight"] ?? "") || null,
          weightUnit,
          length: parseFloat(row["length"] ?? "") || null,
          width: parseFloat(row["width"] ?? "") || null,
          height: parseFloat(row["height"] ?? "") || null,
          address: row["address"]?.trim() || null,
          returnPolicy: row["returnPolicy"]?.trim() || null,
          isFeatured: row["isFeatured"]?.trim().toLowerCase() === "true",
          metaTitle: row["metaTitle"]?.trim() || null,
          metaDescription: row["metaDescription"]?.trim() || null,
          isPublished: false,
          isDigital: false,
          isBookable: false,
          images: [],
        },
        select: { id: true },
      })
      result.created++
      result.createdProducts.push({ productId: product.id, name })
    } catch (e) {
      result.failed.push({ row: rowNum, name, error: "Database error" })
      console.error(e)
    }
  }

  return result
}
