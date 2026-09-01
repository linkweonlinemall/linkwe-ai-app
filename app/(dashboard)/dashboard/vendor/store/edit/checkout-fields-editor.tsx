"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { CheckoutField, CheckoutFieldType } from "@/lib/checkout/custom-fields";

const TYPES: { value: CheckoutFieldType; label: string }[] = [
  { value: "text", label: "Text answer" }, { value: "select", label: "Select one" },
  { value: "multiselect", label: "Select several" }, { value: "checklist", label: "Checklist" },
  { value: "upload", label: "File upload" },
];

export default function CheckoutFieldsEditor({ initialFields }: { initialFields: CheckoutField[] }) {
  const [fields, setFields] = useState(initialFields);
  const update = (id: string, patch: Partial<CheckoutField>) => setFields((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  return <div className="mb-5 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
    <input type="hidden" name="checkoutFields" value={JSON.stringify(fields)} />
    <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold text-zinc-900">Customer checkout questions</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Collect the details you need before customers pay. Answers are saved with the order.</p></div><button type="button" onClick={() => setFields((rows) => [...rows, { id: crypto.randomUUID(), label: "", type: "text", required: false, options: [] }])} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#D4450A] px-3 text-xs font-bold text-white shadow-md"><Plus className="size-4" />Add</button></div>
    <div className="mt-4 space-y-3">{fields.length === 0 ? <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-7 text-center text-xs text-zinc-500">No custom questions yet.</p> : fields.map((field, index) => <div key={field.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 sm:p-4"><div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]"><input value={field.label} onChange={(e) => update(field.id, { label: e.target.value })} placeholder={`Question ${index + 1}`} className="min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#D4450A]" /><select value={field.type} onChange={(e) => update(field.id, { type: e.target.value as CheckoutFieldType })} className="min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm">{TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select><button type="button" onClick={() => setFields((rows) => rows.filter((row) => row.id !== field.id))} aria-label="Delete question" className="flex size-11 items-center justify-center rounded-xl border border-red-100 bg-white text-red-600"><Trash2 className="size-4" /></button></div>{["select","multiselect","checklist"].includes(field.type) ? <input value={field.options.join(", ")} onChange={(e) => update(field.id, { options: e.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} placeholder="Options separated by commas" className="mt-3 min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#D4450A]" /> : null}<label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-zinc-600"><input type="checkbox" checked={field.required} onChange={(e) => update(field.id, { required: e.target.checked })} className="size-4 accent-[#D4450A]" />Required before payment</label></div>)}</div>
  </div>;
}
