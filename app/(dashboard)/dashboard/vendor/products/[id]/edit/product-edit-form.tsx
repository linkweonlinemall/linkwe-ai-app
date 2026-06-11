"use client";

import { useActionState, useRef, useState } from "react";
import type { ProductCondition, WeightUnit, LicenceType } from "@prisma/client";

import type { ProductFieldErrors } from "@/app/actions/product";
import { updateProduct } from "@/app/actions/product";
import { uploadDigitalFile } from "@/app/actions/digital-upload";
import DraggableImageGrid from "@/components/vendor/draggable-image-grid";
import RelatedItemsPanel from "@/components/vendor/RelatedItemsPanel";
import ProductVariantEditor from "@/components/vendor/ProductVariantEditor";
import type { ContentLinkItem } from "@/lib/content-links/types";
import { reorderProductImages } from "@/app/actions/ai-vendor-image";
import StoreLocationPicker from "@/components/storefront/StoreLocationPicker";
import Input from "@/components/ui/Input";
import RichTextEditor from "@/components/ui/RichTextEditor";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";

const PRODUCT_CATEGORY_OPTIONS = [
  { value: "clothing_apparel", label: "Clothing & Apparel" },
  { value: "shoes_footwear", label: "Shoes & Footwear" },
  { value: "bags_accessories", label: "Bags & Accessories" },
  { value: "jewellery_watches", label: "Jewellery & Watches" },
  { value: "health_beauty", label: "Health & Beauty" },
  { value: "food_beverages", label: "Food & Beverages" },
  { value: "groceries", label: "Groceries" },
  { value: "home_furniture", label: "Home & Furniture" },
  { value: "kitchen_dining", label: "Kitchen & Dining" },
  { value: "garden_outdoor", label: "Garden & Outdoor" },
  { value: "electronics", label: "Electronics" },
  { value: "phones_tablets", label: "Phones & Tablets" },
  { value: "computers_laptops", label: "Computers & Laptops" },
  { value: "cameras_photography", label: "Cameras & Photography" },
  { value: "gaming", label: "Gaming" },
  { value: "sports_fitness", label: "Sports & Fitness" },
  { value: "toys_games", label: "Toys & Games" },
  { value: "baby_kids", label: "Baby & Kids" },
  { value: "books_stationery", label: "Books & Stationery" },
  { value: "art_crafts", label: "Art & Crafts" },
  { value: "music_instruments", label: "Music & Instruments" },
  { value: "automotive_parts", label: "Automotive Parts" },
  { value: "tools_hardware", label: "Tools & Hardware" },
  { value: "pet_supplies", label: "Pet Supplies" },
  { value: "office_supplies", label: "Office Supplies" },
  { value: "medical_wellness", label: "Medical & Wellness" },
  { value: "religious_cultural", label: "Religious & Cultural" },
  { value: "local_handmade", label: "Local & Handmade" },
  { value: "carnival_costumes", label: "Carnival & Costumes" },
  { value: "other", label: "Other" },
] as const;

export type VendorProductEditPayload = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  category: string | null;
  brand: string | null;
  tagsDisplay: string;
  condition: ProductCondition | null;
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  stock: number | null;
  images: string[];
  weight: number | null;
  weightUnit: WeightUnit | null;
  length: number | null;
  width: number | null;
  height: number | null;
  allowDelivery: boolean;
  allowPickup: boolean;
  returnPolicy: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isPublished: boolean;
  isFeatured: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  hasVariants: boolean;
  isDigital: boolean;
  digitalFileUrl: string | null;
  previewUrl: string | null;
  fileType: string | null;
  fileSizeKb: number | null;
  downloadLimit: number | null;
  downloadExpiryDays: number | null;
  licenceType: LicenceType | null;
};

export type VendorProductInitialVariant = {
  id: string;
  name: string;
  attributes: any;
  price: number | null;
  stock: number | null;
  sku: string | null;
  images: string[];
};

type ProductEditFormProps = {
  product: VendorProductEditPayload;
  variants?: VendorProductInitialVariant[];
  initialRelatedItems?: ContentLinkItem[];
};

export function ProductEditForm({
  product,
  variants = [],
  initialRelatedItems = [],
}: ProductEditFormProps) {
  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => updateProduct(_prev, formData),
    null as { ok: false; errors: ProductFieldErrors } | { ok: false; error: string } | null,
  );

  const errors = state?.ok === false && "errors" in state ? state.errors : undefined;
  const topError =
    state?.ok === false && "error" in state ? state.error : errors?._general;

  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [allowDelivery, setAllowDelivery] = useState(product.allowDelivery);
  const [remainingImages, setRemainingImages] = useState<string[]>(product.images);
  const [previews, setPreviews] = useState<{ url: string; name: string }[]>([]);
  const [productType, setProductType] = useState<"simple" | "variable" | "digital">(
    product.isDigital ? "digital" : product.hasVariants ? "variable" : "simple",
  );
  const [digitalFileUrl, setDigitalFileUrl] = useState(product.digitalFileUrl ?? "");
  const [digitalFileName, setDigitalFileName] = useState(product.digitalFileUrl ? "Current file" : "");
  const [digitalFileType, setDigitalFileType] = useState(product.fileType ?? "");
  const [digitalFileSizeKb, setDigitalFileSizeKb] = useState<number | null>(product.fileSizeKb ?? null);
  const [uploadingDigital, setUploadingDigital] = useState(false);
  const [digitalUploadError, setDigitalUploadError] = useState<string | null>(null);
  const digitalFileRef = useRef<HTMLInputElement>(null);

  const onNewFilesChange = (e: import("react").ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) {
      setPreviews([]);
      return;
    }
    const maxNew = Math.max(0, 10 - remainingImages.length);
    const next: { url: string; name: string }[] = [];
    for (let i = 0; i < Math.min(list.length, maxNew); i++) {
      const f = list[i];
      next.push({ url: URL.createObjectURL(f), name: f.name });
    }
    setPreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return next;
    });
  };

  function fieldError(name: string): string | undefined {
    return errors?.[name];
  }

  async function handleDigitalUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDigital(true);
    setDigitalUploadError(null);
    setDigitalFileName(file.name);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadDigitalFile(formData);
    if (result.ok) {
      setDigitalFileUrl(result.url);
      setDigitalFileType(result.fileType);
      setDigitalFileSizeKb(result.fileSizeKb);
    } else {
      setDigitalUploadError(result.error);
      setDigitalFileName(product.digitalFileUrl ? "Current file" : "");
    }
    setUploadingDigital(false);
  }

  function removeExisting(url: string) {
    setRemainingImages((imgs) => imgs.filter((u) => u !== url));
  }

  const canAddMore = remainingImages.length + previews.length < 10;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <a
            href="/dashboard/vendor/products"
            className="mb-1 inline-flex items-center gap-1 text-xs hover:underline"
            style={{ color: "var(--blue)" }}
          >
            ← Back to products
          </a>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Edit Product
          </h1>
        </div>
        <button
          type="submit"
          form="product-form"
          name="intent"
          value="save"
          disabled={pending}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: "var(--scarlet)" }}
        >
          Save Changes
        </button>
      </div>

      <form id="product-form" action={formAction} className="flex flex-col gap-6">
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="existingImages" value={JSON.stringify(remainingImages)} />
        <input type="hidden" name="isDigital" value={productType === "digital" ? "true" : "false"} />
        <input type="hidden" name="hasVariants" value={productType === "variable" ? "true" : "false"} />

        {topError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {topError}
          </p>
        ) : null}

        <div
          className="rounded-xl bg-white p-5 sm:p-6"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Product Type
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setProductType("simple")}
              className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all
                ${
                  productType === "simple"
                    ? "border-[#D4450A] bg-[#D4450A]/5"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
            >
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2
                  ${productType === "simple" ? "border-[#D4450A]" : "border-zinc-300"}`}
              >
                {productType === "simple" ? <div className="h-2 w-2 rounded-full bg-[#D4450A]" /> : null}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Simple product</p>
                <p className="mt-0.5 text-xs text-zinc-500">One price, one stock level. No variants.</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setProductType("variable")}
              className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all
                ${
                  productType === "variable"
                    ? "border-[#D4450A] bg-[#D4450A]/5"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
            >
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2
                  ${productType === "variable" ? "border-[#D4450A]" : "border-zinc-300"}`}
              >
                {productType === "variable" ? <div className="h-2 w-2 rounded-full bg-[#D4450A]" /> : null}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Variable product</p>
                <p className="mt-0.5 text-xs text-zinc-500">Multiple sizes, colours, or other options.</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setProductType("digital")}
              className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all
                ${
                  productType === "digital"
                    ? "border-[#D4450A] bg-[#D4450A]/5"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
            >
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2
                  ${productType === "digital" ? "border-[#D4450A]" : "border-zinc-300"}`}
              >
                {productType === "digital" ? <div className="h-2 w-2 rounded-full bg-[#D4450A]" /> : null}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Digital product</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Downloadable file — music, software, ebook, template.
                </p>
              </div>
            </button>
          </div>
        </div>

        <div
          className="rounded-xl bg-white p-5 sm:p-6"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Product Details
          </h2>
          <div className="space-y-6">
            <Input
              required
              error={fieldError("name")}
              label="Name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              required
              error={fieldError("slug")}
              helperText={`linkwe.com/products/${slug || "your-slug"}`}
              label="Slug"
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Description</label>
              <RichTextEditor
                name="description"
                defaultValue={product.description ?? ""}
                placeholder="Describe the product — materials, dimensions, what is included, care instructions..."
                maxLength={2000}
              />
            </div>
            <Input
              defaultValue={product.shortDescription ?? ""}
              helperText="Max 160 characters."
              label="Short description"
              maxLength={160}
              name="shortDescription"
              placeholder="One line that appears on product cards and search results"
            />
            <Select className="text-base" defaultValue={product.category ?? ""} label="Category" name="category">
              <option value="">Select a category</option>
              {PRODUCT_CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Input defaultValue={product.brand ?? ""} label="Brand" name="brand" />
            <Input
              defaultValue={product.tagsDisplay}
              label="Tags"
              name="tags"
              placeholder="sneakers, red, nike — comma separated"
            />
            {productType === "digital" ? (
              <input type="hidden" name="condition" value={product.condition ?? "NEW"} />
            ) : null}
            {productType !== "digital" ? (
              <Select
                required
                defaultValue={product.condition ?? ""}
                error={fieldError("condition")}
                label="Condition"
                name="condition"
              >
                <option value="" disabled>
                  Select condition
                </option>
                <option value="NEW">New</option>
                <option value="USED">Used</option>
                <option value="REFURBISHED">Refurbished</option>
              </Select>
            ) : null}
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="isFeatured"
                defaultChecked={product.isFeatured}
                className="rounded border-zinc-300"
              />
              <span className="text-sm font-medium text-zinc-800">Feature this product</span>
            </label>
            <p className="-mt-2 text-xs text-zinc-500">
              Featured products may appear in highlighted sections on your store.
            </p>
          </div>
        </div>

        <div
          className="rounded-xl bg-white p-5 sm:p-6"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Pricing &amp; Inventory
          </h2>
          <div className="space-y-6">
            <input type="hidden" name="currency" value="TTD" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                required
                defaultValue={product.price}
                error={fieldError("price")}
                label="Price (TTD)"
                min={0}
                name="price"
                step={0.01}
                type="number"
              />
              {productType !== "digital" ? (
                <Input
                  defaultValue={product.stock ?? ""}
                  helperText="Leave blank for unlimited stock"
                  label="Stock quantity"
                  min={0}
                  name="stock"
                  step={1}
                  type="number"
                />
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-xs font-semibold text-zinc-700">Stock</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Digital products have unlimited stock automatically
                  </p>
                </div>
              )}
            </div>
            {productType === "digital" ? <input type="hidden" name="stock" value="" /> : null}
            <Input
              defaultValue={product.compareAtPrice ?? ""}
              helperText="Show a crossed-out original price when this product is on sale"
              label="Original price (TTD)"
              min={0}
              name="compareAtPrice"
              step={0.01}
              type="number"
            />
            <Input
              defaultValue={product.sku ?? ""}
              helperText="Your internal reference code"
              label="SKU"
              name="sku"
            />
          </div>
        </div>

        {productType === "digital" ? (
          <div
            className="rounded-xl bg-white p-5 sm:p-6"
            style={{ border: "1px solid var(--card-border)" }}
          >
            <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Digital file
            </h2>
            <div className="space-y-6">
              <input type="hidden" name="digitalFileUrl" value={digitalFileUrl} />
              <input type="hidden" name="fileType" value={digitalFileType} />
              <input type="hidden" name="fileSizeKb" value={digitalFileSizeKb ?? ""} />

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                  Digital file <span className="text-[#D4450A]">*</span>
                </label>
                <input ref={digitalFileRef} type="file" className="hidden" onChange={handleDigitalUpload} />
                {digitalFileUrl ? (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-emerald-900">{digitalFileName}</p>
                      <p className="text-xs text-emerald-700">
                        {digitalFileType.toUpperCase()}
                        {digitalFileSizeKb
                          ? ` · ${
                              digitalFileSizeKb >= 1024
                                ? `${(digitalFileSizeKb / 1024).toFixed(1)} MB`
                                : `${digitalFileSizeKb} KB`
                            }`
                          : ""}
                        · Uploaded successfully
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDigitalFileUrl("");
                        setDigitalFileName("");
                        setDigitalFileType("");
                        setDigitalFileSizeKb(null);
                        if (digitalFileRef.current) digitalFileRef.current.value = "";
                      }}
                      className="shrink-0 text-xs font-medium text-emerald-700 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={uploadingDigital}
                    onClick={() => digitalFileRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 px-4 py-6 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {uploadingDigital ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Click to upload your digital file
                      </>
                    )}
                  </button>
                )}
                <p className="mt-1.5 text-xs text-zinc-400">
                  Supports PDF, MP3, MP4, ZIP, EPUB, PSD, AI, SVG, DOCX and more. Max 500MB.
                </p>
                {digitalUploadError ? (
                  <p className="mt-1.5 text-xs text-red-600">{digitalUploadError}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Preview URL (optional)</label>
                <input
                  name="previewUrl"
                  type="url"
                  placeholder="https://..."
                  defaultValue={product.previewUrl ?? ""}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none focus:bg-white"
                />
                <p className="mt-1 text-xs text-zinc-400">A free sample customers can access before buying</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Download limit</label>
                  <input
                    name="downloadLimit"
                    type="number"
                    min={1}
                    placeholder="e.g. 3 (blank = unlimited)"
                    defaultValue={product.downloadLimit ?? ""}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-zinc-400">Max downloads per purchase</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    Download expiry (days)
                  </label>
                  <input
                    name="downloadExpiryDays"
                    type="number"
                    min={1}
                    placeholder="e.g. 30 (blank = never)"
                    defaultValue={product.downloadExpiryDays ?? ""}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:bg-white focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-zinc-400">Days before download link expires</p>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Licence type</label>
                <select
                  name="licenceType"
                  defaultValue={product.licenceType ?? ""}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
                >
                  <option value="">Select licence</option>
                  <option value="PERSONAL">Personal use only</option>
                  <option value="COMMERCIAL">Commercial use</option>
                  <option value="EXTENDED">Extended commercial use</option>
                </select>
              </div>
            </div>
          </div>
        ) : null}

        {productType === "variable" ? (
          <div
            className="rounded-xl bg-white p-5 sm:p-6"
            style={{ border: "1px solid var(--card-border)" }}
          >
            <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Variants
            </h2>
            <p className="mb-5 text-xs text-zinc-500">
              Add colours, sizes, materials and other options. Each combination gets its own price and stock.
            </p>
            <ProductVariantEditor productId={product.id} initialVariants={variants} basePrice={product.price} />
          </div>
        ) : null}

        <div
          className="rounded-xl bg-white p-5 sm:p-6"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Images
          </h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <DraggableImageGrid
                images={remainingImages}
                onReorder={async (newImages) => {
                  setRemainingImages(newImages);
                  await reorderProductImages(product.id, newImages);
                }}
                onRemove={(url) => removeExisting(url)}
              />
              {previews.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {previews.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.url}
                      src={p.url}
                      alt={p.name}
                      className="h-16 w-16 rounded-lg object-cover ring-2 ring-[#E8820C]"
                    />
                  ))}
                </div>
              )}
            </div>
            <Input
              accept="image/jpeg,image/png,image/webp"
              className="text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-200 file:px-4 file:py-2"
              disabled={!canAddMore}
              error={fieldError("images")}
              helperText={`Up to 10 images total (${remainingImages.length + previews.length}/10).`}
              label="Add images"
              multiple
              name="newImages"
              type="file"
              onChange={onNewFilesChange}
            />
          </div>
        </div>

        {productType !== "digital" ? (
          <div
            className="rounded-xl bg-white p-5 sm:p-6"
            style={{ border: "1px solid var(--card-border)" }}
          >
            <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Shipping
            </h2>
            <div className="space-y-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowDelivery}
                  onChange={(e) => setAllowDelivery(e.target.checked)}
                  className="rounded border-zinc-300"
                />
                <span className="text-sm font-medium text-zinc-800">Offer delivery for this product</span>
              </label>
              <input type="hidden" name="allowDelivery" value={allowDelivery ? "true" : "false"} />
              {!allowDelivery ? (
                <p className="text-xs text-zinc-500">Toggle on to enter weight and dimensions.</p>
              ) : (
                <div className="space-y-6 border-l-2 border-[#E8820C] pl-4">
                  <Input defaultValue={product.weight ?? ""} label="Weight" name="weight" step={0.01} type="number" />
                  <Select className="text-base" defaultValue={product.weightUnit ?? ""} label="Weight unit" name="weightUnit">
                    <option value="">Select</option>
                    <option value="KG">KG</option>
                    <option value="LB">LB</option>
                  </Select>
                  <Input defaultValue={product.length ?? ""} label="Length (cm)" name="length" step={0.01} type="number" />
                  <Input defaultValue={product.width ?? ""} label="Width (cm)" name="width" step={0.01} type="number" />
                  <Input defaultValue={product.height ?? ""} label="Height (cm)" name="height" step={0.01} type="number" />
                </div>
              )}
              <label className="flex items-center gap-2">
                <input type="checkbox" name="allowPickup" defaultChecked={product.allowPickup} className="rounded border-zinc-300" />
                <span className="text-sm font-medium text-zinc-800">Allow local pickup</span>
              </label>
              <Textarea
                defaultValue={product.returnPolicy ?? ""}
                label="Return policy"
                name="returnPolicy"
                placeholder="e.g. Returns accepted within 14 days in original condition"
                rows={3}
              />
            </div>
          </div>
        ) : null}

        {productType !== "digital" ? (
          <div
            className="rounded-xl bg-white p-5 sm:p-6"
            style={{ border: "1px solid var(--card-border)" }}
          >
            <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Location
            </h2>
            <div className="space-y-6">
              <p className="text-sm text-zinc-600">
                Search for your address then drag the pin to fine-tune the exact pickup or origin location.
              </p>
              <StoreLocationPicker
                initialAddress={product.address ?? ""}
                initialLat={product.latitude ?? null}
                initialLng={product.longitude ?? null}
              />
            </div>
          </div>
        ) : null}

        <div
          className="rounded-xl bg-white p-5 sm:p-6"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            SEO
          </h2>
          <div className="space-y-6">
            <p className="text-sm text-zinc-600">
              Optional. Controls how this product appears in Google search results.
            </p>
            <Input
              defaultValue={product.metaTitle ?? ""}
              helperText="Max 60 characters."
              label="Meta title"
              maxLength={60}
              name="metaTitle"
              placeholder="Leave blank to use product name"
            />
            <Textarea
              defaultValue={product.metaDescription ?? ""}
              helperText="Max 160 characters. Shown in Google search results."
              label="Meta description"
              maxLength={160}
              name="metaDescription"
              placeholder="Leave blank to use short description"
              rows={3}
            />
          </div>
        </div>

        <RelatedItemsPanel
          fromType="PRODUCT"
          fromId={product.id}
          initialItems={initialRelatedItems}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            name="intent"
            value="save"
            disabled={pending}
            className="inline-flex h-11 min-w-[160px] items-center justify-center rounded-lg border-2 border-[#D4450A] bg-white px-4 text-sm font-medium text-[#D4450A] hover:bg-[#fff5f0] disabled:opacity-60"
          >
            Save changes
          </button>
          {product.isPublished ? (
            <button
              type="submit"
              name="intent"
              value="unpublish"
              disabled={pending}
              className="inline-flex h-11 min-w-[180px] items-center justify-center rounded-lg bg-[#D4450A] px-4 text-sm font-medium text-white hover:bg-[#B83A08] disabled:opacity-60"
            >
              Save and unpublish
            </button>
          ) : (
            <button
              type="submit"
              name="intent"
              value="publish"
              disabled={pending}
              className="inline-flex h-11 min-w-[180px] items-center justify-center rounded-lg bg-[#D4450A] px-4 text-sm font-medium text-white hover:bg-[#B83A08] disabled:opacity-60"
            >
              Save and publish
            </button>
          )}
        </div>
      </form>
    </>
  );
}
