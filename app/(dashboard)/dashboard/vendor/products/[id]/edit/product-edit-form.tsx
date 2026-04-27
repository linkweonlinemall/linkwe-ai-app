"use client";

import { useActionState, useState } from "react";
import type { ProductCondition, WeightUnit } from "@prisma/client";

import type { ProductFieldErrors } from "@/app/actions/product";
import { updateProduct } from "@/app/actions/product";
import DraggableImageGrid from "@/components/vendor/draggable-image-grid";
import { reorderProductImages } from "@/app/actions/ai-vendor-image";
import StoreLocationPicker from "@/components/storefront/StoreLocationPicker";
import Input from "@/components/ui/Input";
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
};

export function ProductEditForm({ product }: { product: VendorProductEditPayload }) {
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

      <form id="product-form" action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="existingImages" value={JSON.stringify(remainingImages)} />

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
            Product Details
          </h2>
          <div className="space-y-4">
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
            <Textarea defaultValue={product.description ?? ""} label="Description" name="description" rows={4} />
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
          <div className="space-y-4">
            <input type="hidden" name="currency" value="TTD" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <Input
                defaultValue={product.stock ?? ""}
                helperText="Leave blank for unlimited stock"
                label="Stock quantity"
                min={0}
                name="stock"
                step={1}
                type="number"
              />
            </div>
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

        <div
          className="rounded-xl bg-white p-5 sm:p-6"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Images
          </h2>
          <div className="space-y-4">
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

        <div
          className="rounded-xl bg-white p-5 sm:p-6"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Shipping
          </h2>
          <div className="space-y-4">
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
              <div className="space-y-4 border-l-2 border-[#E8820C] pl-4">
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

        <div
          className="rounded-xl bg-white p-5 sm:p-6"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Location
          </h2>
          <div className="space-y-4">
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

        <div
          className="rounded-xl bg-white p-5 sm:p-6"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            SEO
          </h2>
          <div className="space-y-4">
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
