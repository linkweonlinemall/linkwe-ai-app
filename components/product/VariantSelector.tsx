"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { selectProductAttribute, type ProductOption } from "@/lib/product/display";

export type VariantAttribute = {
  name: string;
  value: string;
  hex?: string;
};

type Variant = ProductOption;

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
  const [chosenId, setChosenId] = useState<string | null>(null);
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

  function handleSelect(attrName: string, value: string) {
    const next = selectProductAttribute(variants, selected, attrName, value);
    setSelected(next.selected);
    onVariantChange?.(next.variant, next.complete);
  }

  const selectionComplete =
    attributeNames.length === 0 || attributeNames.every((n) => Boolean(selected[n]));

  if (attributeNames.length === 0) return <div className="mb-5 flex flex-wrap gap-2" aria-label="Product options">{variants.map(variant => <button key={variant.id} type="button" aria-pressed={chosenId === variant.id} onClick={() => { setChosenId(variant.id); onVariantChange?.(variant, true); }} className={`min-h-11 rounded-xl border px-4 text-sm ${chosenId === variant.id ? "border-[#D4450A] bg-[#D4450A] text-white" : "border-stone-200 bg-white text-zinc-800"}`}>{variant.name}</button>)}</div>;

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
                const isSelected = selected[attrName] === attr.value;
                const swatchBg = colour && attr.hex ? attr.hex : undefined;
                return (
                  <button
                    key={attr.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleSelect(attrName, attr.value)}
                    className={`relative inline-flex min-h-11 items-center gap-2 overflow-hidden rounded-2xl border px-4 py-2 text-sm font-bold transition-all ${
                      isSelected
                        ? "border-[#D4450A] bg-[#D4450A] text-white shadow-[0_9px_24px_rgba(212,69,10,.22)]"
                        : "border-stone-200 bg-white text-zinc-800 shadow-sm hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
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
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {!selectionComplete ? (
        <div className="mb-6 flex items-start gap-2 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white px-4 py-3 shadow-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-600" strokeWidth={2} aria-hidden />
          <p className="font-sans text-sm font-medium text-amber-800">{chooseMessage(attributeNames, selected)}</p>
        </div>
      ) : null}
    </div>
  );
}
