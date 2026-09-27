"use client";
import { useState } from "react";
import { FilterSelect } from "@/components/filters/FilterControls";
import { canonicalStoreCategory, catalogueCategories } from "@/lib/catalog/categories";
type Props = { name: string; value?: string; onChange?: (value: string) => void };
export default function CategoryPicker({ name, value = "", onChange }: Props) {
  const [selected, setSelected] = useState(canonicalStoreCategory(value));
  return <div className="rounded-2xl border border-sky-100 bg-white p-4"><input type="hidden" name={name} value={selected}/><FilterSelect label="Business category" value={selected} options={catalogueCategories("stores")} placeholder="Choose your main business category" onChange={next=>{setSelected(next);onChange?.(next);}}/><p className="mt-3 text-xs leading-5 text-slate-500">Use the category that best describes your business. These are the same categories customers use to find stores.</p></div>;
}
