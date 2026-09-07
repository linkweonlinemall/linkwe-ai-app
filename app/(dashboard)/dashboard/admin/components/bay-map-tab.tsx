"use client";
import { useCallback, useEffect, useState } from "react";
import { Box } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { clearStaleBay, createDockBay, getDockBayData } from "@/app/actions/admin-bays";
import { updateWarehouseOrder } from "@/app/actions/admin-operations";
type Data = Awaited<ReturnType<typeof getDockBayData>>;
export default function BayMapTab() {
  const [data, setData] = useState<Data>();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [destination, setDestination] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setData(await getDockBayData()); setError(""); } catch { setError("Could not load bays. Please refresh."); } }, []);
  useEffect(() => { void load(); const timer = setInterval(() => { if (!document.hidden) void load(); }, 30000); return () => clearInterval(timer); }, [load]);
  const parcels = [...(data?.unassigned ?? []), ...(data?.bays.flatMap(b => b.occupants) ?? [])].filter((p,i,a) => a.findIndex(x => x.id === p.id) === i);
  const parcel = parcels.find(p => p.id === selected);
  const occupied = data?.bays.filter(b => b.occupants.length || b.blocked).length ?? 0;
  const control = "min-h-11 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm";
  async function move() {
    if (!parcel || !window.confirm(`Move ${parcel.store.name} · ${parcel.referenceNumber ?? parcel.id} from ${parcel.bayNumber ? `bay ${parcel.bayNumber}` : "unassigned"} to bay ${destination}? Confirm the physical parcel has been moved.`)) return;
    setBusy(true);
    try { const result = await updateWarehouseOrder({ orderId: parcel.mainOrderId, splitId: parcel.id, action: "move_bay", bay: Number(destination) }); if (!result.ok) throw new Error(result.error); toast.success("Bay assignment saved"); await load(); } catch(e) { toast.error(e instanceof Error ? e.message : "Could not move parcel"); } finally { setBusy(false); }
  }
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-semibold">Warehouse bays</h2><p className="text-sm text-zinc-500">{occupied} occupied · {(data?.bays.length ?? 0)-occupied} available · {data?.unassigned.length ?? 0} unassigned. Updates every 30 seconds.</p></div><button className={control} onClick={() => void load()}>Refresh</button></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}{!data && !error && <p>Loading bays…</p>}{data && !data.bays.length && <p className="rounded-xl border bg-white p-5 text-sm text-zinc-500">No bays configured yet. Use Add bay below to match the numbers in your warehouse.</p>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{data?.bays.map(b => <div key={b.bayNumber} className={`min-h-40 rounded-2xl border p-4 ${b.occupants.length || b.blocked ? "border-orange-200 bg-orange-50" : "border-emerald-200 bg-emerald-50"}`}><div className="mb-3 flex justify-between font-semibold"><span>Bay {b.bayNumber}</span><Box size={20}/></div>{b.occupants.map(p => <button key={p.id} onClick={() => setSelected(p.id)} className={`mb-2 block w-full rounded-xl bg-white p-3 text-left text-sm shadow-sm ${selected === p.id ? "ring-2 ring-orange-500" : ""}`}><strong className="block">{p.store.name}</strong><span className="block break-all text-xs text-zinc-600">{p.referenceNumber ?? p.id}</span><span className="mt-2 block text-xs">{p.mainOrder.buyer.fullName} · {p.mainOrder.referenceNumber}</span><span className="block text-xs text-zinc-500">{p.status.replaceAll("_", " ")}</span></button>)}{b.occupants.length > 1 && <p className="text-xs text-red-700">Multiple records share this bay. Move parcels to separate bays.</p>}{!b.occupants.length && <p className="text-sm">{b.blocked ? "Reserved — old assignment needs review" : "Available"}</p>}{b.blocked && <button disabled={busy} className="mt-2 min-h-10 rounded-lg border px-2 text-xs" onClick={async () => { if (!window.confirm(`Clear the old assignment for bay ${b.bayNumber}? Verify the physical bay is empty first.`)) return; setBusy(true); try { await clearStaleBay(b.bayNumber); await load(); } catch(e) { toast.error(e instanceof Error ? e.message : "Unable to clear bay"); } finally { setBusy(false); } }}>Review & clear bay</button>}</div>)}</div>
    {data?.unassigned.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-semibold">Received, without a bay</h3><div className="mt-3 flex flex-wrap gap-2">{data.unassigned.map(p => <button className={control} key={p.id} onClick={() => setSelected(p.id)}>{p.store.name} · {p.referenceNumber ?? p.id}</button>)}</div></div> : null}
    <div className="rounded-2xl border bg-white p-5"><h3 className="font-semibold">Assign or move a vendor parcel</h3>{parcel && <Link className="mt-2 inline-block text-sm text-orange-700 underline" href={`/dashboard/admin?tab=linkwe-delivery&order=${parcel.mainOrderId}`}>Manage customer order →</Link>}<p className="my-2 text-sm text-zinc-500">Choose a parcel, then its destination. Occupied bays cannot be overwritten. Bays are released when the order leaves the warehouse.</p><div className="flex flex-col gap-3 sm:flex-row"><select aria-label="Vendor parcel" className={`${control} min-w-0 flex-1`} value={selected} onChange={e => setSelected(e.target.value)}><option value="">Select vendor order</option>{parcels.map(p => <option key={p.id} value={p.id}>{p.store.name} · {p.referenceNumber ?? p.id} · {p.bayNumber ? `Bay ${p.bayNumber}` : "Unassigned"}</option>)}</select><input aria-label="Destination bay" placeholder="Bay number" className={control} type="number" min={1} max={9999} value={destination} onChange={e => setDestination(e.target.value)}/><button disabled={busy || !parcel || !destination} className={`${control} disabled:opacity-40`} onClick={() => void move()}>Review move</button></div></div>
    <button disabled={busy} className={control} onClick={async () => { const value = window.prompt("Number of the new bay (1–9999)"); if (!value) return; setBusy(true); try { await createDockBay(Number(value)); await load(); toast.success("Bay ready"); } catch(e) { toast.error(e instanceof Error ? e.message : "Could not create bay"); } finally { setBusy(false); } }}>+ Add bay</button>
  </section>;
}
