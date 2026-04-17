"use client";

import { useActionState, useState } from "react";
import type { ProductCondition, WeightUnit } from "@prisma/client";
import type { ProductFieldErrors } from "@/app/actions/product";
import { updateProduct } from "@/app/actions/product";

export type VendorProductEditPayload = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
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
    <form action={formAction} className="mx-auto max-w-2xl space-y-10">
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="existingImages" value={JSON.stringify(remainingImages)} />

      {topError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200" role="alert">
          {topError}
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
            onChange={(e) => setName(e.target.value)}
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
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <p className="mt-1 text-xs text-zinc-500">linkwe.com/products/{slug || "your-slug"}</p>
          {fieldError("slug") ? <p className="mt-1 text-sm text-red-600">{fieldError("slug")}</p> : null}
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Description</span>
          <textarea
            name="description"
            rows={4}
            defaultValue={product.description ?? ""}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Category</span>
          <input name="category" defaultValue={product.category ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Brand</span>
          <input name="brand" defaultValue={product.brand ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Tags</span>
          <input
            name="tags"
            defaultValue={product.tagsDisplay}
            placeholder="sneakers, red, nike — comma separated"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Condition</span>
          <select
            required
            name="condition"
            defaultValue={product.condition ?? ""}
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
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Pricing</h2>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Price (TTD)</span>
          <input
            required
            type="number"
            name="price"
            min={0}
            step={0.01}
            defaultValue={product.price}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
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
            defaultValue={product.compareAtPrice ?? ""}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <p className="mt-1 text-xs text-zinc-500">Show a crossed-out original price when this product is on sale</p>
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Stock</h2>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">SKU</span>
          <input name="sku" defaultValue={product.sku ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50" />
          <p className="mt-1 text-xs text-zinc-500">Your internal reference code</p>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Stock quantity</span>
          <input
            type="number"
            name="stock"
            min={0}
            step={1}
            defaultValue={product.stock ?? ""}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <p className="mt-1 text-xs text-zinc-500">Leave blank for unlimited stock</p>
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Images</h2>
        <div className="flex flex-wrap gap-2">
          {remainingImages.map((url) => (
            <div key={url} className="relative h-16 w-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => removeExisting(url)}
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs text-white hover:bg-red-600"
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
          ))}
          {previews.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.url} src={p.url} alt={p.name} className="h-16 w-16 rounded-lg object-cover ring-2 ring-[#E8820C]" />
          ))}
        </div>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Add images</span>
          <input
            type="file"
            name="newImages"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={!canAddMore}
            onChange={onNewFilesChange}
            className="mt-1 w-full text-sm text-zinc-900 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-200 file:px-4 file:py-2 dark:text-zinc-50 dark:file:bg-zinc-700"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Up to 10 images total ({remainingImages.length + previews.length}/10).
          </p>
          {fieldError("images") ? <p className="mt-1 text-sm text-red-600">{fieldError("images")}</p> : null}
        </label>
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
                defaultValue={product.weight ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Weight unit</span>
              <select
                name="weightUnit"
                defaultValue={product.weightUnit ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="">Select</option>
                <option value="KG">KG</option>
                <option value="LB">LB</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Length (cm)</span>
              <input type="number" name="length" step={0.01} defaultValue={product.length ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Width (cm)</span>
              <input type="number" name="width" step={0.01} defaultValue={product.width ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Height (cm)</span>
              <input type="number" name="height" step={0.01} defaultValue={product.height ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50" />
            </label>
          </div>
        )}
        <label className="flex items-center gap-2">
          <input type="checkbox" name="allowPickup" defaultChecked={product.allowPickup} className="rounded border-zinc-300" />
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Allow local pickup</span>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Return policy</span>
          <textarea
            name="returnPolicy"
            rows={3}
            defaultValue={product.returnPolicy ?? ""}
            placeholder="e.g. Returns accepted within 14 days in original condition"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Location</h2>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Origin or pickup address</span>
          <input name="address" defaultValue={product.address ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50" />
          <p className="mt-1 text-xs text-zinc-500">
            Shown on the map so customers know where this product is coming from
          </p>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Latitude</span>
          <input type="number" name="latitude" step={0.000001} defaultValue={product.latitude ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Longitude</span>
          <input type="number" name="longitude" step={0.000001} defaultValue={product.longitude ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50" />
        </label>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="intent"
          value="save"
          disabled={pending}
          className="inline-flex h-11 min-w-[160px] items-center justify-center rounded-lg border-2 border-[#D4450A] bg-white px-4 text-sm font-medium text-[#D4450A] hover:bg-[#fff5f0] disabled:opacity-60 dark:bg-zinc-900"
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
  );
}
