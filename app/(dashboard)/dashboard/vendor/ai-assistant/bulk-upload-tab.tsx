"use client"

import { useRef, useState } from "react"
import Papa from "papaparse"

import DraggableImageGrid from "@/components/vendor/draggable-image-grid"

import type { BulkResult, ProductType } from "@/app/actions/ai-bulk-upload"
import { bulkUploadFromCSV, generateBulkTemplate } from "@/app/actions/ai-bulk-upload"
import { reorderProductImages } from "@/app/actions/ai-vendor-image"

const PRODUCT_TYPES: {
  type: ProductType
  label: string
  emoji: string
  description: string
  color: string
}[] = [
  {
    type: "simple",
    label: "Simple Product",
    emoji: "📦",
    description:
      "One price, one stock level. Perfect for most physical products.",
    color: "#D4450A",
  },
  {
    type: "variable",
    label: "Variable Product",
    emoji: "🎨",
    description:
      "Has sizes, colours, or options. Each variant has its own price and stock.",
    color: "#E8820C",
  },
  {
    type: "service",
    label: "Service",
    emoji: "⚡",
    description:
      "Bookable service with no stock. Haircuts, repairs, consultations.",
    color: "#1A7FB5",
  },
  {
    type: "digital",
    label: "Digital Product",
    emoji: "💾",
    description:
      "Downloadable file. No shipping needed. Designs, music, documents.",
    color: "#6B4FBB",
  },
]

export default function BulkUploadTab() {
  const [stage, setStage] = useState<
    "type" | "upload" | "progress" | "review" | "results" | "images" | "done"
  >("type")
  const [selectedType, setSelectedType] = useState<ProductType>("simple")
  const [publishImmediately, setPublishImmediately] = useState(false)
  const [result, setResult] = useState<BulkResult | null>(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const [createdProducts, setCreatedProducts] = useState<
    { productId: string; name: string; type: string }[]
  >([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)
  const [productImages, setProductImages] = useState<Record<string, string[]>>(
    {}
  )
  const [rexReview, setRexReview] = useState<string>("")
  const [reviewLoading, setReviewLoading] = useState(false)
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([])

  async function handleDownloadTemplate() {
    const u8 = await generateBulkTemplate(selectedType)
    const blob = new Blob([new Uint8Array(u8)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `linkwe-${selectedType}-template.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCSVUpload(file: File) {
    setCsvUploading(true)
    setStage("progress")
    setProgress(10)

    const text = await file.text()
    setProgress(30)

    try {
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      })
      const rows = parsed.data
      setParsedRows(rows)
      setProgress(60)

      setReviewLoading(true)
      setProgress(80)

      const rowSummary = rows
        .slice(0, 20)
        .map((row, i) => {
          const name = row["name"] || "unnamed"
          const price = row["price"] || "no price"
          const description = row["description"] || "no description"
          const category = row["category"] || "no category"
          const stock = row["stock"] || "no stock"
          const tags = row["tags"] || "no tags"
          return `Row ${i + 2}: "${name}" | Price: TTD ${price} | Category: ${category} | Stock: ${stock} | Tags: ${tags} | Description: ${description.slice(0, 80)}${description.length > 80 ? "..." : ""}`
        })
        .join("\n")

      const prompt = `You are Rex, a sharp Trinidadian business partner reviewing a bulk product upload for a vendor on LinkWe marketplace.

The vendor is uploading ${rows.length} ${selectedType} product(s). Review these rows and give concise, actionable feedback:

${rowSummary}

Your review must:
1. Flag any rows with missing required fields (name or price)
2. Point out descriptions that are too short or weak (under 20 words)
3. Suggest better tags if tags are missing or thin
4. Note any pricing that seems off for T&T market
5. Give an overall verdict — is this upload ready to go live or does it need work?

Be direct, specific, and helpful. Use Trinidadian tone. Keep it under 200 words. End with a clear recommendation: READY TO UPLOAD or NEEDS WORK.`

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
        }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let reviewText = ""

      if (reader) {
        streamLoop: while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue
            const data = line.slice(6)
            if (data === "[DONE]") break streamLoop
            try {
              const evt = JSON.parse(data) as { text?: string }
              if (evt.text) reviewText += evt.text
            } catch {
              /* skip */
            }
          }
        }
      }

      setRexReview(reviewText)
      setProgress(100)
      setTimeout(() => {
        setStage("review")
        setReviewLoading(false)
        setCsvUploading(false)
      }, 300)
    } catch (err) {
      console.error("Rex review error:", err)
      setReviewLoading(false)
      const fd = new FormData()
      fd.append("csv", file)
      const res = await bulkUploadFromCSV(fd, selectedType, publishImmediately)
      setResult(res)
      if (res.createdProducts?.length > 0) setCreatedProducts(res.createdProducts)
      setProgress(100)
      setTimeout(() => {
        setStage("results")
        setCsvUploading(false)
      }, 500)
    }
  }

  async function handleConfirmUpload() {
    setStage("progress")
    setProgress(20)
    setCsvUploading(true)

    const csv = Papa.unparse(parsedRows)
    const file = new File([csv], "upload.csv", { type: "text/csv" })
    const fd = new FormData()
    fd.append("csv", file)
    setProgress(60)

    const res = await bulkUploadFromCSV(fd, selectedType, publishImmediately)
    setProgress(100)
    setResult(res)
    if (res.createdProducts?.length > 0) setCreatedProducts(res.createdProducts)
    setTimeout(() => {
      setStage("results")
      setCsvUploading(false)
    }, 500)
  }

  function reset() {
    setStage("type")
    setResult(null)
    setCreatedProducts([])
    setCurrentIndex(0)
    setProductImages({})
    setProgress(0)
    setPublishImmediately(false)
    setRexReview("")
    setParsedRows([])
    setReviewLoading(false)
  }

  const selectedTypeInfo = PRODUCT_TYPES.find((t) => t.type === selectedType)!

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-y-auto p-6">
      {stage === "type" && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-1 text-lg font-semibold text-white">
              Bulk upload products
            </h2>
            <p className="text-sm text-zinc-400">
              Upload up to 50 products at once. First, choose the type of
              product you are uploading.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PRODUCT_TYPES.map((pt) => (
              <button
                key={pt.type}
                type="button"
                onClick={() => setSelectedType(pt.type)}
                className="flex w-full flex-col items-start gap-2 rounded-xl border-2 p-4 text-left font-sans transition-all"
                style={{
                  borderColor:
                    selectedType === pt.type ? pt.color : "rgb(63,63,70)",
                  backgroundColor:
                    selectedType === pt.type ? `${pt.color}26` : "rgba(24,24,27,0.78)",
                }}
              >
                <span
                  aria-hidden
                  className="shrink-0 select-none text-4xl leading-none text-zinc-50"
                  style={{
                    fontFamily:
                      "system-ui, \"Apple Color Emoji\", \"Segoe UI Emoji\", sans-serif",
                  }}
                >
                  {pt.emoji}
                </span>
                <div className="min-w-0 w-full text-left">
                  <p className="text-base font-bold leading-snug text-white">
                    {pt.label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                    {pt.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {selectedType === "variable" && (
            <div className="rounded-lg border border-amber-800 bg-amber-950/30 p-4">
              <p className="mb-1 text-xs font-semibold text-amber-400">
                How to add variants
              </p>
              <p className="text-xs text-zinc-400">
                In the variants column use this format:{" "}
                <span className="font-mono text-amber-300">
                  S:150:20|M:150:15|L:160:10
                </span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Each variant is Name:Price:Stock separated by |
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-lg border border-zinc-700 p-4">
            <input
              type="checkbox"
              id="publish-toggle"
              checked={publishImmediately}
              onChange={(e) => setPublishImmediately(e.target.checked)}
              className="h-4 w-4 accent-[#D4450A]"
            />
            <div className="min-w-0">
              <label
                htmlFor="publish-toggle"
                className="mb-1 block cursor-pointer text-sm font-semibold text-white"
              >
                Publish immediately
              </label>
              <p className="text-xs leading-relaxed text-zinc-400">
                If unchecked, products are saved as drafts for you to review
                first
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStage("upload")}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: selectedTypeInfo.color }}
          >
            Continue with {selectedTypeInfo.label} →
          </button>
        </div>
      )}

      {stage === "upload" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStage("type")}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              ← Back
            </button>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {selectedTypeInfo.emoji} {selectedTypeInfo.label} — Bulk Upload
              </h2>
              <p className="text-sm text-zinc-400">
                Download the template, fill it in, then upload it here.
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-zinc-700 p-5">
            <p className="text-sm font-medium text-zinc-300">
              Step 1 — Download the template
            </p>
            <p className="text-xs text-zinc-500">
              The template is pre-filled with an example row and hints for every
              column.
            </p>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-white transition-colors hover:border-zinc-400"
            >
              ⬇ Download {selectedTypeInfo.label} template
            </button>
          </div>

          <div className="space-y-3 rounded-lg border border-zinc-700 p-5">
            <p className="text-sm font-medium text-zinc-300">
              Step 2 — Upload your filled file
            </p>
            <p className="text-xs text-zinc-500">
              {publishImmediately
                ? "Products will be published immediately."
                : "Products will be saved as drafts for you to review."}
            </p>
            <div
              className="cursor-pointer rounded-xl border-2 border-dashed border-zinc-600 p-8 text-center transition-colors hover:border-[#D4450A]"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f) void handleCSVUpload(f)
              }}
            >
              <p className="mb-1 text-sm text-zinc-300">
                Drag and drop your CSV or XLSX here
              </p>
              <p className="text-xs text-zinc-500">or click to browse</p>
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

      {stage === "progress" && (
        <div className="flex flex-col items-center justify-center gap-6 py-20">
          <div className="text-4xl">⚙️</div>
          <div className="w-full max-w-xs">
            <div className="mb-2 flex justify-between">
              <p className="text-sm text-zinc-300">
                {reviewLoading
                  ? "Rex is reviewing your upload..."
                  : "Creating products..."}
              </p>
              <p className="text-sm text-zinc-400">{progress}%</p>
            </div>
            <div className="h-2 rounded-full bg-zinc-700">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  backgroundColor: selectedTypeInfo.color,
                }}
              />
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            Please wait while we set up your listings
          </p>
        </div>
      )}

      {stage === "review" && (
        <div className="space-y-6">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                style={{
                  background: "linear-gradient(135deg, #D4450A, #E8820C)",
                }}
              >
                ⚡
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Rex reviewed your upload
                </p>
                <p className="text-xs text-zinc-500">
                  {parsedRows.length} products · {selectedTypeInfo.label}
                </p>
              </div>
            </div>
            <div
              className="rounded-xl p-4 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {rexReview ||
                "Rex reviewed your products and they look ready to upload."}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleConfirmUpload()}
              className="rounded-lg px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
              style={{ backgroundColor: selectedTypeInfo.color }}
            >
              ✅ Looks good — create products
            </button>
            <button
              type="button"
              onClick={() => setStage("upload")}
              className="rounded-lg border border-zinc-600 px-5 py-2.5 text-sm text-zinc-400 hover:border-zinc-400 hover:text-white"
            >
              ← Fix and re-upload
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-zinc-600 px-5 py-2.5 text-sm text-zinc-400 hover:border-zinc-400 hover:text-white"
            >
              Start over
            </button>
          </div>
        </div>
      )}

      {stage === "results" && result && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-1 text-lg font-semibold text-white">
              {result.created === result.total
                ? "✅ All done!"
                : `⚠️ ${result.created} of ${result.total} created`}
            </h2>
            <p className="text-sm text-zinc-400">
              {result.created} product{result.created !== 1 ? "s" : ""} created
              successfully
              {publishImmediately ? " and published." : " as drafts."}
            </p>
          </div>

          {result.failed.length > 0 && (
            <div className="space-y-2 rounded-lg border border-red-900 bg-red-950/20 p-4">
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
                Add images to your products
              </p>
              <p className="text-xs text-zinc-500">
                We will go through each product one at a time. The first image
                will be the cover image.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex(0)
                    setStage("images")
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-bold text-white hover:opacity-90"
                  style={{ backgroundColor: selectedTypeInfo.color }}
                >
                  Add images now
                </button>
                <a
                  href="/dashboard/vendor/products"
                  className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-white hover:border-zinc-400"
                >
                  Go to products
                </a>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-400 hover:text-white"
                >
                  Upload more
                </button>
              </div>
            </div>
          )}

          {result.created === 0 && (
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:text-white"
            >
              Try again
            </button>
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
              <p className="mt-0.5 text-xs capitalize text-zinc-500">
                {createdProducts[currentIndex].type}
              </p>
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

          {imageUploadError ? (
            <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {imageUploadError}
            </p>
          ) : null}

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
              setImageUploadError(null)
              for (const file of files) {
                const fd = new FormData()
                fd.append("image", file)
                const { uploadProductImage } = await import(
                  "@/app/actions/ai-vendor-image"
                )
                const upResult = await uploadProductImage(pid, fd)
                if (upResult.ok && upResult.images) {
                  setProductImages((prev) => ({ ...prev, [pid]: upResult.images! }))
                } else if (!upResult.ok) {
                  setImageUploadError(upResult.error ?? `Could not upload ${file.name}.`)
                  break
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
              setImageUploadError(null)
              for (const file of files) {
                const fd = new FormData()
                fd.append("image", file)
                const { uploadProductImage } = await import(
                  "@/app/actions/ai-vendor-image"
                )
                const upResult = await uploadProductImage(pid, fd)
                if (upResult.ok && upResult.images) {
                  setProductImages((prev) => ({
                    ...prev,
                    [pid]: upResult.images!,
                  }))
                } else if (!upResult.ok) {
                  setImageUploadError(upResult.error ?? `Could not upload ${file.name}.`)
                  break
                }
              }
              setUploading(false)
              e.target.value = ""
            }}
          />

          {(productImages[createdProducts[currentIndex].productId] ?? [])
            .length > 0 && (
            <div>
              <p className="mb-2 text-xs text-zinc-500">
                Uploaded images — drag to reorder
              </p>
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
                  const upResult = await removeProductImageAI(pid, url)
                  if (upResult.ok && upResult.images) {
                    setProductImages((prev) => ({
                      ...prev,
                      [pid]: upResult.images!,
                    }))
                  }
                }}
              />
            </div>
          )}

          <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={() => setStage("done")}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Skip remaining
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
              className="rounded-lg px-5 py-2 text-sm font-bold text-white hover:opacity-90"
              style={{ backgroundColor: selectedTypeInfo.color }}
            >
              {currentIndex + 1 < createdProducts.length
                ? "Next product →"
                : "Finish"}
            </button>
          </div>
        </div>
      )}

      {stage === "done" && (
        <div className="space-y-4 py-8 text-center">
          <div className="text-5xl">🎉</div>
          <h2 className="text-xl font-semibold text-white">All done!</h2>
          <p className="text-sm text-zinc-400">
            Your products have been created
            {publishImmediately ? " and published" : " as drafts"}.
            {!publishImmediately &&
              " Go to your products page to review and publish them."}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <a
              href="/dashboard/vendor/products"
              className="rounded-lg px-5 py-2 text-sm font-bold text-white hover:opacity-90"
              style={{ backgroundColor: selectedTypeInfo.color }}
            >
              Go to products
            </a>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-zinc-600 px-5 py-2 text-sm text-zinc-400 hover:border-zinc-400 hover:text-white"
            >
              Upload more
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
