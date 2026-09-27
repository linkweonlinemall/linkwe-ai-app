"use client";

import { Check, Info } from "lucide-react";
import {swatchPaint} from "@/lib/variant-options";
import s from "./variants.module.css";
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
          <fieldset key={attrName} className={s.group}>
            <legend>{attributeLabel(attrName)}<span>{selected[attrName] || "Choose your favourite"}</span></legend>
            <div className={colour?s.colours:s.options}>
              {values.map((attr) => {
                const isSelected = selected[attrName] === attr.value;
                const swatchBg = swatchPaint(attr.value,attr.hex);
                const matching = variants.filter(v=>v.attributes.some(a=>a.name===attrName&&a.value===attr.value));
                const available = matching.some(v=>v.stock===null||v.stock>0);
                const matchesOtherChoices = matching.some(v=>Object.entries(selected).every(([key,value])=>key===attrName||v.attributes.some(a=>a.name===key&&a.value===value)));
                return (
                  <button
                    key={attr.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleSelect(attrName, attr.value)}
                    className={colour?s.colour:s.option}
                    data-selected={isSelected}
                    data-sold-out={!available}
                    title={!available?`${attr.value} · Out of stock`:!matchesOtherChoices?`${attr.value} · Selecting this changes other options`:attr.value}
                    aria-label={`${attributeLabel(attrName)}: ${attr.value}${!available?", out of stock":""}`}
                  >
                    {colour && <span className={s.paint} style={{background:swatchBg}} aria-hidden>{isSelected&&<Check size={18}/>}</span>}
                    <span>{attr.value}</span>{!available&&<small>Sold out</small>}
                  </button>
                );
              })}
            </div>
          </fieldset>
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
