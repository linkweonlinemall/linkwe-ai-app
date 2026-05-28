"use client";

import { useEffect, useState } from "react";

import { saveProductVariants, type ProductVariantSaveInput } from "@/app/actions/product-variants";
import { uploadVendorChatImages } from "@/app/actions/ai-vendor-image";
import {
  ATTRIBUTE_REGISTRY,
  COLOUR_OPTIONS,
  SIZE_OPTIONS,
} from "@/lib/variant-options";
import type { SizeType, VariantAttribute } from "@/lib/variant-options";

type Variant = {
  id?: string;
  attributes: VariantAttribute[];
  price: string;
  stock: string;
  sku: string;
};

/** Serializable variant row for create-product form (variantsJson). */
export type VariantRow = {
  id?: string;
  attributes: VariantAttribute[];
  price: string;
  stock: string;
  sku: string;
  images: string[];
  name: string;
};

type ActiveGroup = {
  key: string;
  label: string;
  type: "colour" | "size" | "list" | "custom";
  options?: string[];
  selectedValues: { value: string; hex?: string }[];
};

type Props = {
  productId: string;
  initialVariants?: {
    id: string;
    name: string;
    attributes: unknown;
    price: number | null;
    stock: number | null;
    sku: string | null;
    images?: string[];
  }[];
  basePrice: number;
  /** Vendor product create — hide Save variants, sync rows to parent instead */
  createMode?: boolean;
  onChange?: (rows: VariantRow[]) => void;
};

function listOptions(reg: (typeof ATTRIBUTE_REGISTRY)[number]): string[] | undefined {
  return reg.type === "list" && "options" in reg ? [...reg.options] : undefined;
}

export default function ProductVariantEditor({
  productId,
  initialVariants = [],
  basePrice,
  createMode = false,
  onChange,
}: Props) {
  const [activeGroups, setActiveGroups] = useState<ActiveGroup[]>(() => {
    if (initialVariants.length === 0) return [];
    const groups: Record<string, ActiveGroup> = {};
    for (const v of initialVariants) {
      const attrs = v.attributes as VariantAttribute[];
      for (const attr of attrs) {
        if (!groups[attr.name]) {
          const registry = ATTRIBUTE_REGISTRY.find((r) => r.label.toLowerCase() === attr.name.toLowerCase());
          groups[attr.name] = {
            key: registry?.key ?? attr.name.toLowerCase(),
            label: attr.name,
            type: registry?.type ?? "custom",
            options: registry ? listOptions(registry) : undefined,
            selectedValues: [],
          };
        }
        if (!groups[attr.name].selectedValues.find((sv) => sv.value === attr.value)) {
          groups[attr.name].selectedValues.push({
            value: attr.value,
            hex: attr.hex,
          });
        }
      }
    }
    return Object.values(groups);
  });

  const [variants, setVariants] = useState<Variant[]>(() => {
    if (initialVariants.length === 0) return [];
    return initialVariants.map((v) => ({
      id: v.id,
      attributes: v.attributes as VariantAttribute[],
      price: v.price?.toString() ?? "",
      stock: v.stock?.toString() ?? "",
      sku: v.sku ?? "",
    }));
  });

  const [variantImages, setVariantImages] = useState<Record<number, string[]>>(() => {
    const imgs: Record<number, string[]> = {};
    initialVariants.forEach((v, i) => {
      if (v.images && v.images.length > 0) imgs[i] = v.images;
    });
    return imgs;
  });
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sizeType, setSizeType] = useState<SizeType>("clothing");
  const [customValue, setCustomValue] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!createMode || !onChange) return;
    const rows: VariantRow[] = variants.map((v, i) => ({
      id: v.id,
      attributes: v.attributes,
      price: v.price,
      stock: v.stock,
      sku: v.sku,
      images: variantImages[i] ?? [],
      name: v.attributes.map((a) => a.value).join(" / "),
    }));
    onChange(rows);
  }, [createMode, onChange, variants, variantImages]);

  function addGroup(registryKey: string) {
    const reg = ATTRIBUTE_REGISTRY.find((r) => r.key === registryKey);
    if (!reg) return;
    if (activeGroups.find((g) => g.key === registryKey)) return;
    setActiveGroups((prev) => [
      ...prev,
      {
        key: reg.key,
        label: reg.label,
        type: reg.type,
        options: listOptions(reg),
        selectedValues: [],
      },
    ]);
  }

  function removeGroup(key: string) {
    setActiveGroups((prev) => prev.filter((g) => g.key !== key));
  }

  function toggleValue(groupKey: string, value: string, hex?: string) {
    setActiveGroups((prev) =>
      prev.map((g) => {
        if (g.key !== groupKey) return g;
        const exists = g.selectedValues.find((v) => v.value === value);
        return {
          ...g,
          selectedValues: exists
            ? g.selectedValues.filter((v) => v.value !== value)
            : [...g.selectedValues, { value, hex }],
        };
      }),
    );
  }

  function addCustomValue(groupKey: string) {
    const val = customValue[groupKey]?.trim();
    if (!val) return;
    toggleValue(groupKey, val);
    setCustomValue((prev) => ({ ...prev, [groupKey]: "" }));
  }

  function generateVariants() {
    const validGroups = activeGroups.filter((g) => g.selectedValues.length > 0);
    if (validGroups.length === 0) return;

    function combine(groups: ActiveGroup[]): VariantAttribute[][] {
      if (groups.length === 0) return [[]];
      const [first, ...rest] = groups;
      const restCombos = combine(rest);
      return first.selectedValues.flatMap((val) =>
        restCombos.map((combo) => [
          { name: first.label, value: val.value, hex: val.hex },
          ...combo,
        ]),
      );
    }

    const combinations = combine(validGroups);
    setVariants(
      combinations.map((attrs) => ({
        attributes: attrs,
        price: basePrice.toString(),
        stock: "",
        sku: "",
      })),
    );
    setVariantImages({});
  }

  function updateVariant(index: number, field: keyof Variant, value: string) {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
    setVariantImages((prev) => {
      const next: Record<number, string[]> = {};
      for (const k of Object.keys(prev).map(Number)) {
        if (k < index) next[k] = prev[k] ?? [];
        else if (k > index) next[k - 1] = prev[k] ?? [];
      }
      return next;
    });
  }

  async function handleVariantImageUpload(index: number, files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingIndex(index);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("images", f));
    const result = await uploadVendorChatImages(fd);
    if (result.ok && result.urls) {
      setVariantImages((prev) => ({
        ...prev,
        [index]: [...(prev[index] ?? []), ...result.urls],
      }));
    }
    setUploadingIndex(null);
  }

  function removeVariantImage(variantIndex: number, imageUrl: string) {
    setVariantImages((prev) => ({
      ...prev,
      [variantIndex]: (prev[variantIndex] ?? []).filter((u) => u !== imageUrl),
    }));
  }

  async function handleSave() {
    if (!productId.trim()) return;
    setSaving(true);
    setSaved(false);
    const result = await saveProductVariants(
      productId,
      variants.map(
        (v, i): ProductVariantSaveInput => ({
          attributes: v.attributes,
          price: v.price ? parseFloat(v.price) : undefined,
          stock: v.stock ? parseInt(v.stock, 10) : undefined,
          sku: v.sku || undefined,
          images: variantImages[i] ?? [],
        }),
      ),
    );
    setSaving(false);
    if (result.ok) setSaved(true);
  }

  const totalCombinations = activeGroups.reduce((acc, g) => acc * Math.max(g.selectedValues.length, 1), 1);
  const hasSelections = activeGroups.some((g) => g.selectedValues.length > 0);

  return (
    <div className="space-y-6">
      {/* Attribute picker */}
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Select attributes</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {ATTRIBUTE_REGISTRY.map((attr) => {
            const active = !!activeGroups.find((g) => g.key === attr.key);
            return (
              <button
                key={attr.key}
                type="button"
                onClick={() => (active ? removeGroup(attr.key) : addGroup(attr.key))}
                className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition-all
                  ${active
                    ? "border-[#D4450A] bg-[#D4450A] text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"}`}
              >
                {attr.label}
                {active ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active group editors */}
      {activeGroups.length > 0 ? (
        <div className="space-y-4">
          {activeGroups.map((group) => (
            <div key={group.key} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-900">{group.label}</p>
                <button
                  type="button"
                  onClick={() => removeGroup(group.key)}
                  className="text-xs text-zinc-400 hover:text-red-500"
                >
                  Remove
                </button>
              </div>

              {group.type === "colour" ? (
                <div className="flex flex-wrap gap-2">
                  {COLOUR_OPTIONS.map((colour) => {
                    const selected = group.selectedValues.find((v) => v.value === colour.value);
                    return (
                      <button
                        key={colour.value}
                        type="button"
                        onClick={() => toggleValue(group.key, colour.value, colour.hex)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all
                          ${
                            selected
                              ? "border-[#D4450A] bg-[#D4450A]/10 text-[#D4450A]"
                              : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                          }`}
                      >
                        <span
                          className="h-4 w-4 shrink-0 rounded-full"
                          style={{
                            background: colour.hex,
                            border: colour.hex === "#FFFFFF" ? "1px solid #e5e7eb" : "none",
                          }}
                        />
                        {colour.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {group.type === "size" ? (
                <div>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {(Object.keys(SIZE_OPTIONS) as SizeType[]).map((typ) => (
                      <button
                        key={typ}
                        type="button"
                        onClick={() => setSizeType(typ)}
                        className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                          sizeType === typ
                            ? "bg-zinc-900 text-white"
                            : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300"
                        }`}
                      >
                        {typ.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SIZE_OPTIONS[sizeType].map((size) => {
                      const selected = group.selectedValues.find((v) => v.value === size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleValue(group.key, size)}
                          className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all
                            ${
                              selected
                                ? "border-[#D4450A] bg-[#D4450A] text-white"
                                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                            }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {group.type === "list" && group.options ? (
                <div className="flex flex-wrap gap-2">
                  {group.options.map((opt) => {
                    const selected = group.selectedValues.find((v) => v.value === opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleValue(group.key, opt)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all
                          ${
                            selected
                              ? "border-[#D4450A] bg-[#D4450A] text-white"
                              : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                          }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {group.type === "custom" ? (
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {group.selectedValues.map((v) => (
                      <span
                        key={v.value}
                        className="flex items-center gap-1 rounded-full bg-[#D4450A]/10 px-3 py-1 text-xs font-medium text-[#D4450A]"
                      >
                        {v.value}
                        <button
                          type="button"
                          onClick={() => toggleValue(group.key, v.value)}
                          className="ml-1 hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={customValue[group.key] ?? ""}
                      onChange={(e) =>
                        setCustomValue((prev) => ({
                          ...prev,
                          [group.key]: e.target.value,
                        }))
                      }
                      placeholder="Type a value and press Enter..."
                      className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
                      onKeyDown={(e) => e.key === "Enter" && addCustomValue(group.key)}
                    />
                    <button
                      type="button"
                      onClick={() => addCustomValue(group.key)}
                      className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-200"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : null}

              {group.selectedValues.length > 0 ? (
                <p className="mt-2 text-xs text-zinc-400">
                  {group.selectedValues.length} value{group.selectedValues.length !== 1 ? "s" : ""} selected
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* Generate button */}
      {hasSelections ? (
        <button
          type="button"
          onClick={generateVariants}
          className="w-full rounded-xl border-2 border-dashed border-[#D4450A]/50 py-3 text-sm font-bold text-[#D4450A]
            transition-colors hover:bg-[#D4450A]/5"
        >
          Generate {totalCombinations} variant combination{totalCombinations !== 1 ? "s" : ""} →
        </button>
      ) : null}

      {/* Variants table */}
      {variants.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-zinc-700">
              {variants.length} variant{variants.length !== 1 ? "s" : ""}
            </p>
            <button
              type="button"
              onClick={() => {
                setVariants([]);
                setVariantImages({});
              }}
              className="text-xs text-zinc-400 hover:text-red-500"
            >
              Clear all
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500">Variant</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500">Price (TTD)</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500">Stock</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500">SKU</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500">Images</th>
                  <th className="w-8 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {variants.map((variant, i) => (
                  <tr key={i} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {variant.attributes.map((attr, ai) => (
                          <span key={ai} className="flex items-center gap-1.5">
                            {attr.hex && !attr.hex.includes("gradient") ? (
                              <span
                                className="h-4 w-4 rounded-full border border-zinc-200"
                                style={{ background: attr.hex }}
                              />
                            ) : null}
                            <span className="text-xs font-medium text-zinc-700">{attr.value}</span>
                            {ai < variant.attributes.length - 1 ? <span className="text-zinc-300">/</span> : null}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={variant.price}
                        onChange={(e) => updateVariant(i, "price", e.target.value)}
                        placeholder={basePrice.toString()}
                        className="w-24 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm focus:border-[#D4450A] focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={variant.stock}
                        onChange={(e) => updateVariant(i, "stock", e.target.value)}
                        placeholder="∞"
                        className="w-20 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm focus:border-[#D4450A] focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={variant.sku}
                        onChange={(e) => updateVariant(i, "sku", e.target.value)}
                        placeholder="Optional"
                        className="w-28 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm focus:border-[#D4450A] focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(variantImages[i] ?? []).map((url) => (
                          <div key={url} className="relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail preview of vendor-uploaded URLs */}
                            <img
                              src={url}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover border border-zinc-200"
                            />
                            <button
                              type="button"
                              onClick={() => removeVariantImage(i, url)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] hidden group-hover:flex items-center justify-center"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {(variantImages[i] ?? []).length < 5 && (
                          <label
                            className={`w-10 h-10 rounded-lg border-2 border-dashed border-zinc-300 flex items-center justify-center cursor-pointer hover:border-[#D4450A] transition-colors
                              ${uploadingIndex === i ? "opacity-50" : ""}`}
                          >
                            {uploadingIndex === i ? (
                              <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="text-zinc-400"
                              >
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              disabled={uploadingIndex !== null}
                              onChange={(e) => handleVariantImageUpload(i, e.target.files)}
                            />
                          </label>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeVariant(i)}
                        className="text-zinc-300 transition-colors hover:text-red-400"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!createMode ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-4 w-full rounded-xl bg-[#D4450A] py-3 text-sm font-bold text-white transition-opacity hover:opacity-90
              disabled:opacity-50"
            >
              {saving ? "Saving..." : `Save ${variants.length} variants`}
            </button>
          ) : null}

          {saved ? (
            <p className="mt-2 text-center text-xs font-medium text-emerald-600">✓ Variants saved successfully</p>
          ) : null}
        </div>
      ) : null}

      {!hasSelections && variants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center">
          <p className="text-sm text-zinc-400">Select attributes above to start building variants</p>
        </div>
      ) : null}
    </div>
  );
}
