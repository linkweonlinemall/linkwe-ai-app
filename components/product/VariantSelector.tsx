"use client";

import { useState } from "react";

type VariantAttribute = {
  name: string;
  value: string;
  hex?: string;
};

type Variant = {
  id: string;
  name: string;
  attributes: VariantAttribute[];
  price: number | null;
  stock: number | null;
  images: string[];
};

type Props = {
  variants: Variant[];
  onVariantChange?: (variant: Variant | null, allSelected: boolean) => void;
};

export default function VariantSelector({ variants, onVariantChange }: Props) {
  const [selected, setSelected] = useState<Record<string, string>>({});

  const attributeNames = Array.from(new Set(variants.flatMap((v) => v.attributes.map((a) => a.name))));

  function getValuesForAttribute(attrName: string) {
    const seen = new Set<string>();
    const values: VariantAttribute[] = [];
    for (const variant of variants) {
      const attr = variant.attributes.find((a) => a.name === attrName);
      if (attr && !seen.has(attr.value)) {
        seen.add(attr.value);
        values.push(attr);
      }
    }
    return values;
  }

  function findVariant(selections: Record<string, string>): Variant | null {
    if (Object.keys(selections).length < attributeNames.length) return null;
    return variants.find((v) => v.attributes.every((a) => selections[a.name] === a.value)) ?? null;
  }

  function isValueAvailable(attrName: string, value: string): boolean {
    const testSelections = { ...selected, [attrName]: value };
    return variants.some(
      (v) =>
        Object.entries(testSelections).every(([name, val]) => {
          if (name === attrName) return true;
          const attr = v.attributes.find((a) => a.name === name);
          return attr?.value === val;
        }) && v.attributes.find((a) => a.name === attrName)?.value === value,
    );
  }

  function handleSelect(attrName: string, value: string) {
    const newSelected = { ...selected, [attrName]: value };
    setSelected(newSelected);
    const variant = findVariant(newSelected);
    const allSel =
      attributeNames.length > 0 && Object.keys(newSelected).length === attributeNames.length;
    onVariantChange?.(variant, allSel);
  }

  const allSelected = Object.keys(selected).length === attributeNames.length;
  const isColour = (attrName: string) =>
    attrName.toLowerCase() === "colour" || attrName.toLowerCase() === "color";

  return (
    <div className="space-y-4">
      {attributeNames.map((attrName) => {
        const values = getValuesForAttribute(attrName);
        const isColor = isColour(attrName);
        return (
          <div key={attrName}>
            {/* Attribute label row */}
            <div className="mb-2.5 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">{attrName}</span>
              {selected[attrName] ? (
                <span className="rounded-full bg-[#D4450A]/10 px-2.5 py-0.5 text-xs font-semibold text-[#D4450A]">
                  {selected[attrName]}
                </span>
              ) : null}
            </div>

            {/* Colour swatches */}
            {isColor ? (
              <div className="flex flex-wrap gap-2.5">
                {values.map((attr) => {
                  const available = isValueAvailable(attrName, attr.value);
                  const isSelected = selected[attrName] === attr.value;
                  return (
                    <button
                      key={attr.value}
                      type="button"
                      disabled={!available}
                      onClick={() => handleSelect(attrName, attr.value)}
                      title={attr.value}
                      className={`relative h-9 w-9 rounded-full transition-all duration-150
                      ${
                        isSelected
                          ? "scale-110 ring-2 ring-[#D4450A] ring-offset-2"
                          : "ring-1 ring-zinc-200 hover:scale-105 hover:ring-zinc-400"
                      }
                      ${!available ? "cursor-not-allowed opacity-30" : "cursor-pointer"}`}
                      style={{
                        background: attr.hex ?? "#000",
                        border:
                          attr.hex === "#FFFFFF" || attr.hex === "#ffffff"
                            ? "1px solid #e5e7eb"
                            : "none",
                      }}
                    >
                      {!available ? (
                        <span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
                          <span className="absolute h-px w-full rotate-45 bg-zinc-400/70" />
                        </span>
                      ) : null}
                      {isSelected ? (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Size / other attributes — Amazon pill style */
              <div className="flex flex-wrap gap-2">
                {values.map((attr) => {
                  const available = isValueAvailable(attrName, attr.value);
                  const isSelected = selected[attrName] === attr.value;
                  return (
                    <button
                      key={attr.value}
                      type="button"
                      disabled={!available}
                      onClick={() => handleSelect(attrName, attr.value)}
                      className={`relative min-w-[3rem] rounded-lg border-2 px-3.5 py-2 text-sm font-semibold transition-all duration-150
                      ${
                        isSelected
                          ? "border-[#D4450A] bg-[#D4450A]/5 text-[#D4450A] shadow-sm"
                          : available
                            ? "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                            : "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300"
                      }`}
                    >
                      {!available ? (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg">
                          <span className="absolute h-px w-full rotate-[-15deg] bg-zinc-300" />
                        </span>
                      ) : null}
                      {attr.value}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Prompt to select remaining */}
      {!allSelected && attributeNames.some((n) => !selected[n]) ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-xs font-medium text-amber-700">
            Select {attributeNames.filter((n) => !selected[n]).join(" and ")} to continue
          </p>
        </div>
      ) : null}
    </div>
  );
}
