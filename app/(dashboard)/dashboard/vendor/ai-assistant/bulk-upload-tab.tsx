"use client"

import { useState, useRef } from "react"
import { reorderProductImages } from "@/app/actions/ai-vendor-image"
import DraggableImageGrid from "@/components/vendor/draggable-image-grid"
import { bulkUploadFromCSV } from "@/app/actions/ai-bulk-upload"

type FailedRow = { row: number; name: string; error: string }
type BulkResult = {
  total: number
  created: number
  failed: FailedRow[]
  createdProducts?: { productId: string; name: string }[]
}

export default function BulkUploadTab() {
  const [stage, setStage] = useState<
    "upload" | "results" | "images" | "done"
  >("upload")
  const [result, setResult] = useState<BulkResult | null>(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [createdProducts, setCreatedProducts] = useState<
    { productId: string; name: string }[]
  >([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [productImages, setProductImages] = useState<Record<string, string[]>>(
    {}
  )
  const stockInputRef = useRef<HTMLInputElement>(null)

  async function handleDownloadTemplate() {
    const { generateXLSXTemplate } = await import("@/app/actions/ai-vendor")
    const u8 = await generateXLSXTemplate()
    const ab = u8.buffer.slice(
      u8.byteOffset,
      u8.byteOffset + u8.byteLength
    ) as ArrayBuffer
    const blob = new Blob([ab], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "linkwe-product-template.xlsx"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCSVUpload(file: File) {
    setCsvUploading(true)
    const fd = new FormData()
    fd.append("csv", file)
    const res = await bulkUploadFromCSV(fd)
    setResult(res)
    if (res.createdProducts && res.createdProducts.length > 0) {
      setCreatedProducts(res.createdProducts)
    }
    setStage("results")
    setCsvUploading(false)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-y-auto p-6">
      {stage === "upload" && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-1 text-lg font-medium text-white">
              Bulk upload products
            </h2>
            <p className="text-sm text-zinc-400">
              Upload up to 50 products at once using a CSV file.
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-zinc-700 p-5">
            <p className="text-sm font-medium text-zinc-300">
              Step 1 — Download the template
            </p>
            <p className="text-xs text-zinc-500">
              Fill in your product details. Each row is one product.
            </p>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="rounded bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600"
            >
              Download CSV template
            </button>
          </div>

          <div className="space-y-3 rounded-lg border border-zinc-700 p-5">
            <p className="text-sm font-medium text-zinc-300">
              Step 2 — Upload your filled CSV
            </p>
            <p className="text-xs text-zinc-500">
              All products will be created as drafts. You can add images next.
            </p>

            <div
              className="cursor-pointer rounded-lg border-2 border-dashed border-zinc-600 p-8 text-center transition-colors hover:border-zinc-400"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f) void handleCSVUpload(f)
              }}
            >
              {csvUploading ? (
                <p className="text-sm text-zinc-400">
                  Uploading and creating products…
                </p>
              ) : (
                <>
                  <p className="mb-1 text-sm text-zinc-300">
                    Drag and drop your CSV here
                  </p>
                  <p className="text-xs text-zinc-500">or click to browse</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleCSVUpload(f)
              }}
            />
          </div>
        </div>
      )}

      {stage === "results" && result && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-1 text-lg font-medium text-white">
              Upload complete
            </h2>
            <p className="text-sm text-zinc-400">
              {result.created} of {result.total} products created successfully.
            </p>
          </div>

          {result.failed.length > 0 && (
            <div className="space-y-2 rounded-lg border border-red-900 p-4">
              <p className="text-sm font-medium text-red-400">Failed rows</p>
              {result.failed.map((f) => (
                <div key={f.row} className="text-xs text-zinc-400">
                  Row {f.row} — {f.name || "unnamed"}: {f.error}
                </div>
              ))}
            </div>
          )}

          {result.created > 0 && (
            <div className="space-y-3 rounded-lg border border-zinc-700 p-5">
              <p className="text-sm font-medium text-zinc-300">
                Now let&apos;s add images
              </p>
              <p className="text-xs text-zinc-500">
                We&apos;ll go through each product one at a time. The first
                image you upload will be the featured image shown in search
                results.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex(0)
                    setStage("images")
                  }}
                  className="rounded bg-[#D4450A] px-4 py-2 text-sm text-white hover:opacity-90"
                >
                  Add images now
                </button>
                <a
                  href="/dashboard/vendor/products"
                  className="rounded bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600"
                >
                  Go to products
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {stage === "images" && createdProducts[currentIndex] && (
        <div className="mx-auto max-w-xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-xs text-zinc-500">
                Product {currentIndex + 1} of {createdProducts.length}
              </p>
              <h2 className="text-xl font-semibold text-white">
                {createdProducts[currentIndex].name}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                if (currentIndex + 1 < createdProducts.length) {
                  setCurrentIndex((i) => i + 1)
                } else {
                  setStage("done")
                }
              }}
              className="text-xs text-zinc-400 underline hover:text-zinc-200"
            >
              Skip
            </button>
          </div>

          <div
            className="cursor-pointer rounded-xl border-2 border-dashed border-zinc-600 bg-zinc-900/50 p-8 text-center transition-colors hover:border-[#D4450A]"
            onClick={() => document.getElementById("bulk-image-input")?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault()
              const files = Array.from(e.dataTransfer.files).filter((f) =>
                f.type.startsWith("image/")
              )
              if (!files.length) return
              const pid = createdProducts[currentIndex].productId
              setUploading(true)
              for (const file of files) {
                const fd = new FormData()
                fd.append("image", file)
                const { uploadProductImage } = await import(
                  "@/app/actions/ai-vendor-image"
                )
                const result = await uploadProductImage(pid, fd)
                if (result.ok && result.images) {
                  setProductImages((prev) => ({
                    ...prev,
                    [pid]: result.images!,
                  }))
                }
              }
              setUploading(false)
            }}
          >
            {uploading ? (
              <p className="text-sm text-zinc-400">Uploading...</p>
            ) : (
              <>
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-zinc-400"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="mb-1 text-sm font-medium text-zinc-300">
                  Drag and drop images here
                </p>
                <p className="text-xs text-zinc-500">
                  or click to browse — select multiple at once
                </p>
              </>
            )}
          </div>

          <input
            id="bulk-image-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? [])
              if (!files.length) return
              const pid = createdProducts[currentIndex].productId
              setUploading(true)
              for (const file of files) {
                const fd = new FormData()
                fd.append("image", file)
                const { uploadProductImage } = await import(
                  "@/app/actions/ai-vendor-image"
                )
                const result = await uploadProductImage(pid, fd)
                if (result.ok && result.images) {
                  setProductImages((prev) => ({
                    ...prev,
                    [pid]: result.images!,
                  }))
                }
              }
              setUploading(false)
              e.target.value = ""
            }}
          />

          {(productImages[createdProducts[currentIndex].productId] ?? [])
            .length > 0 && (
            <div>
              <p className="mb-2 text-xs text-zinc-500">Uploaded images</p>
              <DraggableImageGrid
                images={
                  productImages[createdProducts[currentIndex].productId] ?? []
                }
                onReorder={async (newImages) => {
                  const pid = createdProducts[currentIndex].productId
                  setProductImages((prev) => ({ ...prev, [pid]: newImages }))
                  await reorderProductImages(pid, newImages)
                }}
                onRemove={async (url) => {
                  const pid = createdProducts[currentIndex].productId
                  const { removeProductImageAI } = await import(
                    "@/app/actions/ai-vendor-image"
                  )
                  const result = await removeProductImageAI(pid, url)
                  if (result.ok && result.images) {
                    setProductImages((prev) => ({
                      ...prev,
                      [pid]: result.images!,
                    }))
                  }
                }}
              />
            </div>
          )}

          <div className="flex items-center justify-between border-t border-zinc-800 pt-2">
            <button
              type="button"
              onClick={() => setStage("done")}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Skip remaining products
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentIndex + 1 < createdProducts.length) {
                  setCurrentIndex((i) => i + 1)
                } else {
                  setStage("done")
                }
              }}
              className="rounded-lg bg-[#D4450A] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              {currentIndex + 1 < createdProducts.length
                ? "Next product →"
                : "Finish"}
            </button>
          </div>
        </div>
      )}

      {stage === "done" && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-white">All done!</h2>
          <p className="text-sm text-zinc-400">
            Your products have been created as drafts. Go to your products page
            to review and publish them.
          </p>
          <a
            href="/dashboard/vendor/products"
            className="inline-block rounded bg-[#D4450A] px-4 py-2 text-sm text-white hover:opacity-90"
          >
            Go to products
          </a>
        </div>
      )}
    </div>
  )
}
