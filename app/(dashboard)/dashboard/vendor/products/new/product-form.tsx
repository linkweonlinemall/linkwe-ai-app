"use client";

import { useActionState, useCallback, useState } from "react";
import type { ProductFieldErrors } from "@/app/actions/product";
import { createProduct } from "@/app/actions/product";
import StoreLocationPicker from "@/components/storefront/StoreLocationPicker";

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

function sanitizeSlugClient(s: string): string {
  let t = s.trim().toLowerCase().replace(/\s+/g, "-");
  t = t.replace(/[^a-z0-9-]/g, "");
  t = t.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return t;
}

export function ProductForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => createProduct(_prev, formData),
    null as { ok: false; errors: ProductFieldErrors } | null,
  );

  const errors = state?.ok === false ? state.errors : null;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [allowDelivery, setAllowDelivery] = useState(false);
  const [previews, setPreviews] = useState<{ url: string; name: string }[]>([]);

  const onNameChange = useCallback(
    (v: string) => {
      setName(v);
      if (!slugManual) setSlug(sanitizeSlugClient(v));
    },
    [slugManual],
  );

  const onFilesChange = (e: import("react").ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) {
      setPreviews([]);
      return;
    }
    const next: { url: string; name: string }[] = [];
    const max = Math.min(list.length, 10);
    for (let i = 0; i < max; i++) {
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

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-10">
      {errors?._general ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200" role="alert">
          {errors._general}
        </p>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Basic info</h2>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Name</span>
          <input
            required
            name="name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          {fieldError("name") ? <p className="mt-1 text-sm text-red-600">{fieldError("name")}</p> : null}
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Slug</span>
          <input
            required
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugManual(true);
              setSlug(e.target.value);
            }}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <p className="mt-1 text-xs text-zinc-500">linkwe.com/products/{slug || "your-slug"}</p>
          {fieldError("slug") ? <p className="mt-1 text-sm text-red-600">{fieldError("slug")}</p> : null}
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Description</span>
          <textarea
            name="description"
            rows={4}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Short description</span>
          <input
            name="shortDescription"
            maxLength={160}
            placeholder="One line that appears on product cards and search results"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <p className="mt-1 text-xs text-zinc-500">Max 160 characters.</p>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Category</span>
          <select
            name="category"
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="">Select a category</option>
            {PRODUCT_CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Brand</span>
          <input name="brand" className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Tags</span>
          <input
            name="tags"
            placeholder="sneakers, red, nike — comma separated"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Condition</span>
          <select
            required
            name="condition"
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="" disabled>
              Select condition
            </option>
            <option value="NEW">New</option>
            <option value="USED">Used</option>
            <option value="REFURBISHED">Refurbished</option>
          </select>
          {fieldError("condition") ? <p className="mt-1 text-sm text-red-600">{fieldError("condition")}</p> : null}
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" name="isFeatured" className="rounded border-zinc-300" />
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Feature this product</span>
        </label>
        <p className="text-xs text-zinc-500 -mt-2">Featured products may appear in highlighted sections on your store.</p>
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Pricing</h2>
        <input type="hidden" name="currency" value="TTD" />
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Price (TTD)</span>
          <input
            required
            type="number"
            name="price"
            min={0}
            step={0.01}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          {fieldError("price") ? <p className="mt-1 text-sm text-red-600">{fieldError("price")}</p> : null}
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Original price (TTD)</span>
          <input
            type="number"
            name="compareAtPrice"
            min={0}
            step={0.01}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <p className="mt-1 text-xs text-zinc-500">Show a crossed-out original price when this product is on sale</p>
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Stock</h2>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">SKU</span>
          <input name="sku" className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50" />
          <p className="mt-1 text-xs text-zinc-500">Your internal reference code</p>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Stock quantity</span>
          <input
            type="number"
            name="stock"
            min={0}
            step={1}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <p className="mt-1 text-xs text-zinc-500">Leave blank for unlimited stock</p>
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Images</h2>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Product images</span>
          <input
            type="file"
            name="images"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={onFilesChange}
            className="mt-1 w-full text-sm text-zinc-900 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-200 file:px-4 file:py-2 dark:text-zinc-50 dark:file:bg-zinc-700"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Upload up to 10 images. First image will be used as the thumbnail.
          </p>
          {fieldError("images") ? <p className="mt-1 text-sm text-red-600">{fieldError("images")}</p> : null}
        </label>
        {previews.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {previews.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.url} src={p.url} alt={p.name} className="h-16 w-16 rounded-lg object-cover" />
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Shipping</h2>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allowDelivery}
            onChange={(e) => setAllowDelivery(e.target.checked)}
            className="rounded border-zinc-300"
          />
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Offer delivery for this product</span>
        </label>
        <input type="hidden" name="allowDelivery" value={allowDelivery ? "true" : "false"} />
        {!allowDelivery ? (
          <p className="text-xs text-zinc-500">Toggle on to enter weight and dimensions.</p>
        ) : (
          <div className="space-y-4 border-l-2 border-[#E8820C] pl-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Weight</span>
              <input
                type="number"
                name="weight"
                step={0.01}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Weight unit</span>
              <select name="weightUnit" className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50">
                <option value="">Select</option>
                <option value="KG">KG</option>
                <option value="LB">LB</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Length (cm)</span>
              <input type="number" name="length" step={0.01} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Width (cm)</span>
              <input type="number" name="width" step={0.01} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Height (cm)</span>
              <input type="number" name="height" step={0.01} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50" />
            </label>
          </div>
        )}
        <label className="flex items-center gap-2">
          <input type="checkbox" name="allowPickup" className="rounded border-zinc-300" />
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Allow local pickup</span>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Return policy</span>
          <textarea
            name="returnPolicy"
            rows={3}
            placeholder="e.g. Returns accepted within 14 days in original condition"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Location</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Search for your address then drag the pin to fine-tune the exact pickup or origin location.
        </p>
        <StoreLocationPicker initialAddress="" initialLat={null} initialLng={null} />
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">SEO</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Optional. Controls how this product appears in Google search results.
        </p>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Meta title</span>
          <input
            name="metaTitle"
            maxLength={60}
            placeholder="Leave blank to use product name"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <p className="mt-1 text-xs text-zinc-500">Max 60 characters.</p>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Meta description</span>
          <textarea
            name="metaDescription"
            maxLength={160}
            rows={3}
            placeholder="Leave blank to use short description"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <p className="mt-1 text-xs text-zinc-500">Max 160 characters. Shown in Google search results.</p>
        </label>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={pending}
          className="inline-flex h-11 min-w-[140px] items-center justify-center rounded-lg border-2 border-[#D4450A] bg-white px-4 text-sm font-medium text-[#D4450A] hover:bg-[#fff5f0] disabled:opacity-60 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          Save as draft
        </button>
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={pending}
          className="inline-flex h-11 min-w-[140px] items-center justify-center rounded-lg bg-[#D4450A] px-4 text-sm font-medium text-white hover:bg-[#B83A08] disabled:opacity-60"
        >
          Publish
        </button>
      </div>
    </form>
  );
}
