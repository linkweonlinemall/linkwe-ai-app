"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { Download, FileUp, Plus, Store, Users } from "lucide-react";
import { toast } from "sonner";
import { importAdminOnboardingRows, type OnboardingResult, type OnboardingRow } from "@/app/actions/admin-onboarding";

const HEADERS = ["fullName","email","phone","password","storeName","storeSlug","categoryId","region","storeDescription","storeStatus","itemType","itemName","itemDescription","price","stock","publish"];
const field = "mt-1 min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

export default function OnboardingStudio() {
  const [mode, setMode] = useState<"single" | "csv">("single");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<OnboardingRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const preview = useMemo(() => rows.slice(0, 6), [rows]);

  async function run(nextRows: OnboardingRow[]) {
    setBusy(true); setResult(null);
    try { const response = await importAdminOnboardingRows(nextRows); setResult(response); if (response.ok) toast.success("Onboarding import completed"); else toast.error("Import completed with items to review"); }
    catch { toast.error("Could not complete onboarding."); }
    finally { setBusy(false); }
  }

  function downloadCsv(data: OnboardingRow[], name: string) {
    const blob = new Blob([Papa.unparse(data, { columns: HEADERS })], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  }

  function downloadTemplate() {
    downloadCsv([], "linkwe-vendor-onboarding-template.csv");
  }

  function downloadSample() {
    downloadCsv([
      { fullName:"Jane Doe", email:"jane@example.com", phone:"868-555-0100", password:"", storeName:"Jane's Shop", storeSlug:"janes-shop", categoryId:"other", region:"San Juan-Laventille", storeDescription:"Local products made in Trinidad and Tobago", storeStatus:"DRAFT", itemType:"product", itemName:"Cocoa body butter", itemDescription:"Handmade cocoa body butter, 200 ml", price:"125", stock:"10", publish:"false" },
      { fullName:"Jane Doe", email:"jane@example.com", phone:"868-555-0100", password:"", storeName:"Jane's Shop", storeSlug:"janes-shop", categoryId:"other", region:"San Juan-Laventille", storeDescription:"Local products made in Trinidad and Tobago", storeStatus:"DRAFT", itemType:"service", itemName:"Gift consultation", itemDescription:"Thirty-minute virtual gift consultation", price:"75", stock:"", publish:"false" },
      { fullName:"Marcus Ali", email:"marcus@example.com", phone:"868-555-0199", password:"StrongPassword123!", storeName:"Marcus Home Services", storeSlug:"marcus-home-services", categoryId:"home_services", region:"Chaguanas", storeDescription:"Reliable home maintenance services", storeStatus:"PENDING_APPROVAL", itemType:"service", itemName:"Electrical inspection", itemDescription:"Residential electrical safety inspection", price:"350", stock:"", publish:"true" },
    ], "linkwe-vendor-onboarding-sample.csv");
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
      <button onClick={() => setMode("single")} className={`flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${mode === "single" ? "bg-zinc-900 text-white" : "text-zinc-600"}`}><Plus size={16}/>One vendor</button>
      <button onClick={() => setMode("csv")} className={`flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${mode === "csv" ? "bg-zinc-900 text-white" : "text-zinc-600"}`}><FileUp size={16}/>CSV bulk import</button>
    </div>

    {mode === "single" ? <form className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7" onSubmit={async e => { e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>; if (!window.confirm(`Create ${values.fullName}'s account, store and first ${values.itemType || "item"}?`)) return; await run([values]); }}>
      <div className="mb-6 flex items-start gap-3"><div className="rounded-2xl bg-orange-50 p-3 text-[#D4450A]"><Store/></div><div><h2 className="text-lg font-bold">Complete vendor setup</h2><p className="text-sm text-zinc-500">Create the login, storefront and first product or service in one save.</p></div></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-medium">Owner name<input className={field} name="fullName" required/></label>
        <label className="text-sm font-medium">Email<input className={field} name="email" type="email" required/></label>
        <label className="text-sm font-medium">Phone<input className={field} name="phone"/></label>
        <label className="text-sm font-medium">Temporary password<input className={field} name="password" minLength={12} placeholder="Leave blank to generate"/></label>
        <label className="text-sm font-medium">Store name<input className={field} name="storeName" required/></label>
        <label className="text-sm font-medium">Store URL name<input className={field} name="storeSlug" placeholder="Generated from store name"/></label>
        <label className="text-sm font-medium">Category key<input className={field} name="categoryId" placeholder="other"/></label>
        <label className="text-sm font-medium">Region<input className={field} name="region" defaultValue="Trinidad and Tobago"/></label>
        <label className="text-sm font-medium">Store status<select className={field} name="storeStatus"><option value="DRAFT">Draft</option><option value="PENDING_APPROVAL">Pending approval</option><option value="ACTIVE">Active / published</option></select></label>
        <label className="text-sm font-medium sm:col-span-2 lg:col-span-3">Store description<textarea className={field} name="storeDescription" rows={3}/></label>
      </div>
      <div className="my-6 border-t border-zinc-100"/>
      <h3 className="mb-4 font-bold">First listing <span className="font-normal text-zinc-400">(optional)</span></h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className="text-sm font-medium">Type<select className={field} name="itemType"><option value="product">Product</option><option value="service">Service</option></select></label><label className="text-sm font-medium lg:col-span-2">Name<input className={field} name="itemName"/></label><label className="text-sm font-medium">Price (TTD)<input className={field} name="price" type="number" min="0" step="0.01"/></label><label className="text-sm font-medium lg:col-span-3">Description<input className={field} name="itemDescription"/></label><label className="flex items-center gap-2 self-end pb-3 text-sm font-medium"><input type="checkbox" name="publish" value="true"/>Publish immediately</label></div>
      <button disabled={busy} className="mt-6 min-h-12 rounded-xl bg-[#D4450A] px-6 font-bold text-white disabled:opacity-50">{busy ? "Creating everything…" : "Review and create vendor"}</button>
    </form> : <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-lg font-bold"><Users className="text-[#D4450A]"/>Bulk onboarding</h2><p className="mt-1 max-w-2xl text-sm text-zinc-500">One row can create a vendor, store and item. Repeat an email on additional rows to add more products or services to the same store.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={downloadTemplate} className="flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold"><Download size={16}/>Blank template</button><button type="button" onClick={downloadSample} className="flex min-h-11 items-center gap-2 rounded-xl bg-orange-50 px-4 text-sm font-semibold text-[#D4450A]"><Download size={16}/>Filled sample</button></div></div>
      <label className="mt-6 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/40 p-6 text-center hover:bg-orange-50"><FileUp className="mb-2 text-[#D4450A]"/><span className="font-semibold">Choose a CSV file</span><span className="text-xs text-zinc-500">Up to 500 rows</span><input type="file" accept=".csv,text/csv" className="sr-only" onChange={e => { const file=e.target.files?.[0]; if(!file)return; setFileName(file.name); Papa.parse<OnboardingRow>(file,{header:true,skipEmptyLines:true,complete: data => setRows(data.data),error: () => toast.error("Could not read that CSV.")}); }}/></label>
      {fileName && <p className="mt-3 text-sm font-medium">{fileName} · {rows.length} rows found</p>}
      {preview.length > 0 && <div className="mt-4 overflow-x-auto rounded-xl border"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-zinc-50 text-zinc-500"><tr>{["Row","Owner","Email","Store","Type","Item"].map(h=><th key={h} className="px-3 py-2">{h}</th>)}</tr></thead><tbody>{preview.map((row,i)=><tr key={i} className="border-t"><td className="px-3 py-2">{i+2}</td><td className="px-3 py-2">{row.fullName}</td><td className="px-3 py-2">{row.email}</td><td className="px-3 py-2">{row.storeName}</td><td className="px-3 py-2">{row.itemType}</td><td className="px-3 py-2">{row.itemName}</td></tr>)}</tbody></table></div>}
      <button disabled={busy || rows.length === 0} onClick={() => void run(rows)} className="mt-5 min-h-12 rounded-xl bg-[#D4450A] px-6 font-bold text-white disabled:opacity-40">{busy ? "Importing…" : `Review and import ${rows.length || ""} rows`}</button>
    </section>}

    {result && <section className={`rounded-2xl border p-5 ${result.errors.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}><h2 className="font-bold">Import summary</h2><p className="mt-1 text-sm">{result.createdUsers} users · {result.createdStores} stores · {result.createdItems} products/services created</p>{result.credentials.length > 0 && <div className="mt-4 rounded-xl bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Temporary credentials — copy now</p>{result.credentials.map(c=><p key={c.email} className="mt-2 break-all font-mono text-xs">{c.email} — {c.password}</p>)}</div>}{result.errors.length > 0 && <ul className="mt-4 space-y-1 text-sm text-amber-900">{result.errors.map((e,i)=><li key={i}>Row {e.row}: {e.message}</li>)}</ul>}</section>}
  </div>;
}
