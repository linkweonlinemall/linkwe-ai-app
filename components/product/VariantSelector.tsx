"use client";

import { Info } from "lucide-react";
import { useState } from "react";

export type VariantAttribute = {
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

function isColourName(attrName: string) {
  const n = attrName.toLowerCase();
  return n === "colour" || n === "color";
}

function attributeLabel(attrName: string) {
  return isColourName(attrName) ? "COLOUR" : attrName.replace(/_/g, " ").toUpperCase();
}

function chooseMessage(attributeNames: string[], selected: Record<string, string>) {
  const missing = attributeNames.filter((n) => !selected[n]);
  if (missing.length === 1 && isColourName(missing[0]!)) {
    return "Choose Colour";
  }
  if (missing.length === 1) {
    const raw = missing[0]!.replace(/_/g, " ");
    return `Choose ${raw.charAt(0).toUpperCase()}${raw.slice(1).toLowerCase()}`;
  }
  return `Choose ${missing.map((n) => n.replace(/_/g, " ")).join(", ")}`;
}

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
    const allSel = attributeNames.every((n) => newSelected[n] !== undefined);
    onVariantChange?.(variant, allSel);
  }

  const selectionComplete =
    attributeNames.length === 0 || attributeNames.every((n) => Boolean(selected[n]));

  if (attributeNames.length === 0) return null;

  return (
    <div className={`w-full font-sans ${selectionComplete ? "mb-6" : ""}`}>
      {attributeNames.map((attrName) => {
        const values = getValuesForAttribute(attrName);
        const colour = isColourName(attrName);
        return (
          <div key={attrName}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">{attributeLabel(attrName)}</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {values.map((attr) => {
                const available = isValueAvailable(attrName, attr.value);
                const isSelected = selected[attrName] === attr.value;
                const swatchBg = colour && attr.hex ? attr.hex : undefined;
                return (
                  <button
                    key={attr.value}
                    type="button"
                    disabled={!available}
                    onClick={() => handleSelect(attrName, attr.value)}
                    className={`relative inline-flex items-center gap-2 overflow-hidden rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      isSelected
                        ? "border-[#D4450A] bg-[#D4450A] text-white shadow-sm"
                        : available
                          ? "border-gray-300 bg-white text-zinc-800 hover:border-zinc-400"
                          : "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300"
                    }`}
                  >
                    {colour && swatchBg ? (
                      <span
                        className={`size-3.5 shrink-0 rounded-full ring-2 ring-offset-2 ${
                          isSelected ? "ring-white/70 ring-offset-[#D4450A]" : "ring-transparent ring-offset-white"
                        }`}
                        style={{
                          background: swatchBg,
                          boxShadow:
                            swatchBg === "#FFFFFF" || swatchBg === "#ffffff" ? "inset 0 0 0 1px #d4d4d8" : undefined,
                        }}
                        aria-hidden
                      />
                    ) : null}
                    <span>{attr.value}</span>
                    {!available ? (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
                        <span className="absolute h-px w-full rotate-[-12deg] bg-zinc-300" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {!selectionComplete ? (
        <div className="mb-6 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-600" strokeWidth={2} aria-hidden />
          <p className="font-sans text-sm font-medium text-amber-800">{chooseMessage(attributeNames, selected)}</p>
        </div>
      ) : null}
    </div>
  );
}
