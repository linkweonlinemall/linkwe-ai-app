"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createAdminService, manageAdminService } from "@/app/actions/admin-services";
export function ServiceActions({ id, name, archived }: { id: string; name: string; archived: boolean }) {
  const router = useRouter(); const [busy,setBusy] = useState(false);
  async function act(action: "archive" | "restore" | "delete") {
    if (!window.confirm(`${action.toUpperCase()} ${name}? ${action === "delete" ? "This permanently removes the service if it has no customer history." : "The service will be unpublished. Existing bookings are preserved."}`)) return;
    setBusy(true); try { const r = await manageAdminService(id, action); if (r.error) toast.error(r.error); else { toast.success("Service updated"); router.refresh(); } } catch { toast.error("Unable to update service"); } finally { setBusy(false); }
  }
  return <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => void act(archived ? "restore" : "archive")} className="min-h-10 rounded-lg border px-3 text-xs">{archived ? "Restore as draft" : "Archive"}</button><button disabled={busy} onClick={() => void act("delete")} className="min-h-10 rounded-lg border border-red-200 px-3 text-xs text-red-700">Delete</button></div>;
}
export function CreateService({ stores }: { stores: { id: string; name: string }[] }) {
  const router = useRouter(); const [busy,setBusy] = useState(false);
  const cls = "min-h-11 min-w-0 rounded-xl border border-zinc-200 px-3 text-sm";
  return <details className="rounded-2xl border bg-white p-5"><summary className="cursor-pointer font-semibold">+ Create service</summary><form className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap" onSubmit={async e => { e.preventDefault(); const fd = new FormData(e.currentTarget); setBusy(true); try { const r = await createAdminService({ storeId: String(fd.get("storeId")), name: String(fd.get("name")), type: String(fd.get("type")) }); if (r.error) toast.error(r.error); else router.push(`/dashboard/admin/records/service/${r.id}`); } catch { toast.error("Unable to create service"); } finally { setBusy(false); } }}><input aria-label="Service name" name="name" placeholder="Service name" required maxLength={150} className={cls}/><select aria-label="Store" name="storeId" required className={cls}><option value="">Choose store</option>{stores.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select><select name="type" aria-label="Service type" className={cls}>{["BOOKABLE", "QUOTE", "SUBSCRIPTION", "ON_DEMAND", "VIRTUAL"].map(s => <option key={s}>{s}</option>)}</select><button disabled={busy} className={`${cls} bg-zinc-900 text-white`}>{busy ? "Creating…" : "Create draft"}</button></form></details>;
}
