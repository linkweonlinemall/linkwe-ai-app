"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { Check, ImagePlus, Search, X } from "lucide-react";
import AdminDialog from "@/app/(dashboard)/dashboard/admin/components/admin-dialog";
import SearchableSelect from "@/components/admin/SearchableSelect";
import { importPhotos } from "@/lib/imports/photos";
import { rowTitle, type ImportBatchView } from "@/lib/imports/model";
import s from "./photo-assignment.module.css";

export default function PhotoAssignmentDialog({ batch, assignments, onChange, onApply, onClose, busy, error, destination, onDestination }: {
  batch: ImportBatchView; assignments: Record<string, string>; onChange: (value: Record<string, string>) => void;
  onApply: () => void; onClose: () => void; busy: boolean; error: string; destination: string; onDestination: (value: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]), [query, setQuery] = useState(""), [filter, setFilter] = useState("all");
  const lastSelected = useRef<string | null>(null);
  const destinations = batch.rows.filter(row => row.state !== "removed").map(row => ({ value: row.id, label: rowTitle(batch.kind, row.values), detail: `Row ${row.number}${row.values.email ? ` · ${row.values.email}` : ""}` }));
  const saved = (url: string) => batch.rows.filter(row => row.state !== "removed" && importPhotos(batch.kind, row.values).includes(url));
  const visible = batch.assets.filter(asset => asset.name.toLowerCase().includes(query.toLowerCase()) && (filter === "all" || filter === "selected" && selected.includes(asset.id) || filter === "unassigned" && !saved(asset.url).length && !assignments[asset.id] || filter === "pending" && !!assignments[asset.id]));
  const pending = Object.entries(assignments).filter(([id, rowId]) => rowId && !saved(batch.assets.find(asset => asset.id === id)?.url || "").some(row => row.id === rowId));
  const chosen = destinations.find(option => option.value === destination);
  function toggle(id: string, shift: boolean) {
    if (shift && lastSelected.current) {
      const start = visible.findIndex(asset => asset.id === lastSelected.current), end = visible.findIndex(asset => asset.id === id);
      if (start >= 0 && end >= 0) { setSelected(previous => [...new Set([...previous, ...visible.slice(Math.min(start, end), Math.max(start, end) + 1).map(asset => asset.id)])]); lastSelected.current = id; return; }
    }
    setSelected(previous => previous.includes(id) ? previous.filter(key => key !== id) : [...previous, id]); lastSelected.current = id;
  }
  return <AdminDialog title="Organise & attach your photos" onClose={() => { if (!busy) onClose(); }}>
    <div className={s.workspace}>
      <p className={s.intro}>Select a group of photos, choose one destination, then attach them together. Your destination stays selected for the next group.</p>
      <div className={s.assignmentBar}><div className={s.destination}><label>Attach photos to</label><SearchableSelect label="Photo destination" value={destination} options={destinations} onChange={onDestination} disabled={busy} placeholder={`Find a ${batch.kind === "vendor" ? "store" : batch.kind}…`}/>{chosen && <small><Check size={12}/>Remembered for your next selection</small>}</div><button type="button" className="admin-button admin-button-primary" disabled={busy || !selected.length || !chosen} onClick={() => { onChange({ ...assignments, ...Object.fromEntries(selected.map(id => [id, destination])) }); setSelected([]); }}>Assign {selected.length || "selected"} photos<ImagePlus size={15}/></button></div>
      <div className={s.filters}><label><Search size={15}/><input aria-label="Search uploaded photos" placeholder="Find photos by filename…" value={query} onChange={e => setQuery(e.target.value)}/></label><select aria-label="Filter uploaded photos" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All photos ({batch.assets.length})</option><option value="unassigned">Unassigned photos</option><option value="pending">Ready to attach</option><option value="selected">Selected photos ({selected.length})</option></select></div>
      <div className={s.selection}><label><input type="checkbox" aria-label="Select all visible photos" disabled={busy || !visible.length} checked={visible.length > 0 && visible.every(asset => selected.includes(asset.id))} onChange={e => setSelected(previous => e.target.checked ? [...new Set([...previous, ...visible.map(asset => asset.id)])] : previous.filter(id => !visible.some(asset => asset.id === id)))}/>Select visible ({visible.length})</label><span>{selected.length} selected</span>{selected.length > 0 && <button type="button" onClick={() => setSelected([])}>Clear selection</button>}</div>
      <div className={s.grid} role="group" aria-label="Uploaded photos">{visible.map(asset => {
        const attached = saved(asset.url), target = destinations.find(option => option.value === assignments[asset.id]);
        const staged = target && !attached.some(row => row.id === target.value);
        return <article key={asset.id} className={s.photo} data-selected={selected.includes(asset.id)}><button type="button" className={s.photoSelect} aria-label={`Select photo ${asset.name}`} aria-pressed={selected.includes(asset.id)} disabled={busy} onClick={e => toggle(asset.id, e.shiftKey)}><img src={asset.url} alt={asset.name}/><span className={s.checkbox}>{selected.includes(asset.id) && <Check size={15}/>}</span><strong>{asset.name}</strong></button><div className={s.assignment}>{staged ? <span className={s.pending}><ImagePlus size={12}/>{target.label}<button type="button" disabled={busy} aria-label={`Clear pending assignment for ${asset.name}`} onClick={() => onChange({ ...assignments, [asset.id]: "" })}><X size={12}/></button></span> : attached.length ? <span className={s.attached}><Check size={12}/>Attached to {attached.map(row => rowTitle(batch.kind, row.values)).join(", ")}</span> : <span className={s.unassigned}>Not assigned yet</span>}</div></article>;
      })}{!visible.length && <p className={s.empty}>No photos in this view. Try another filter.</p>}</div>
      <p className={s.tip}>Tip: hold Shift and select another photo to select a range. Existing cover photos stay in place.</p>
      {error && <p role="alert" className="admin-alert">{error}</p>}
      <footer className={s.footer}><span><strong>{pending.length}</strong> photos ready to attach{pending.length > 0 && <small>Across {new Set(pending.map(([, id]) => id)).size} destinations</small>}</span><button type="button" className="admin-button admin-button-primary" disabled={busy || !pending.length} onClick={onApply}>{busy ? "Attaching photos…" : `Attach ${pending.length} photos`}</button></footer>
    </div>
  </AdminDialog>;
}
