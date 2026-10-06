"use client";
/* Import media can include third-party source URLs and must be previewed before publication. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Check, ChevronDown, Download, FileSpreadsheet, History, ImagePlus, LoaderCircle, Plus, Search, Store, UploadCloud, X } from "lucide-react";
import AdminDialog from "@/app/(dashboard)/dashboard/admin/components/admin-dialog";
import { confirmImportReview, createImportBatch, getImportBatch, getImportWorkspace, prepareImportReview, previewImportFile, runImportCommand, uploadImportPhoto } from "@/app/actions/bulk-import";
import { askBulkImportAssistant, type ImportAssistantStep } from "@/app/actions/bulk-import-assistant";
import { droppedImportPhotos } from "@/lib/imports/drop-files";
import { compressAndUploadImages } from "@/lib/images/upload-images-client";
import { IMPORT_KINDS, REVIEW_OPERATIONS, csvText, photoMatches, rowTitle, type ImportBatchView, type ImportCommand, type ImportField, type ImportKind, type ImportRowView, type ImportResult, type Values } from "@/lib/imports/model";
import type { ParsedSheet } from "@/lib/imports/parser";
import ImportFieldEditor from "./ImportFieldEditor";
import RexConversation, { type RexMessage, type RexPhase } from "@/components/admin/rex/RexConversation";
import PhotoAssignmentDialog from "./PhotoAssignmentDialog";
import { importPhotos as photos, importPhotoPatch as photoPatch, planPhotoAssignments } from "@/lib/imports/photos";
import s from "./imports.module.css";

type Workspace = Awaited<ReturnType<typeof getImportWorkspace>>;
type Review = Awaited<ReturnType<typeof prepareImportReview>>;
const labels: Record<ImportKind, string> = { vendor: "Vendors & stores", product: "Products", service: "Services", event: "Events" };
const operationLabels: Record<string, string> = { check: "Check rows before importing", import: "Import drafts", update_existing: "Update existing records", publish: "Publish selected", draft: "Restore as drafts", archive: "Archive selected", delete: "Remove imported drafts", invite: "Send invitations", refresh: "Refresh linked records" };
function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function ImportWorkspace({ initial, initialKind = "vendor" }: { initial: Workspace; initialKind?: ImportKind }) {
  const [workspace, setWorkspace] = useState(initial), [kind, setKind] = useState<ImportKind>(initialKind);
  const [batch, setBatch] = useState<ImportBatchView | null>(null), batchRef = useRef<ImportBatchView | null>(null);
  const [upload, setUpload] = useState<{ filename: string; sheets: ParsedSheet[] } | null>(null), [sheetIndex, setSheetIndex] = useState(0);
  const [storeId, setStoreId] = useState(""), [mapping, setMapping] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string[]>([]), [expanded, setExpanded] = useState<string[]>([]), [edits, setEdits] = useState<Record<string, Values>>({});
  const [busy, setBusy] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState(""), [query, setQuery] = useState(""), [filter, setFilter] = useState("all"), [limit, setLimit] = useState(30);
  const [review, setReview] = useState<Review | null>(null), [showHistory, setShowHistory] = useState(false), [bulkField, setBulkField] = useState(""), [bulkValue, setBulkValue] = useState<unknown>(null), [showBulk, setShowBulk] = useState(false);
  const [assetMatch, setAssetMatch] = useState<Record<string, string> | null>(null);
  const [chat, setChat] = useState<RexMessage[]>([]), [question, setQuestion] = useState(""), [aiBusy, setAiBusy] = useState(false);
  const pendingSteps = useRef<ImportAssistantStep[]>([]), cancelled = useRef(false), fileInput = useRef<HTMLInputElement>(null);
  const receipts = useRef<string[]>([]);
  const [fieldUploads, setFieldUploads] = useState(0);
  const onFieldUpload = (pending: boolean) => setFieldUploads(count => Math.max(0, count + (pending ? 1 : -1)));
  const [rexPhase, setRexPhase] = useState<RexPhase>("idle");
  const [photoDestination, setPhotoDestination] = useState("");
  const photoDestinations = useRef<Record<string, string>>({});
  const photoDrafts = useRef<Record<string, Record<string, string>>>({});
  function rememberPhotoDestination(value: string) { setPhotoDestination(value); if (batchRef.current) { photoDestinations.current[batchRef.current.id] = value; try { sessionStorage.setItem(`import-photo-destination:${batchRef.current.id}`, value); } catch {} } }

  const activeKind = batch?.kind || kind, fields = (workspace.fields[activeKind] || []) as ImportField[];
  const dirty = Object.keys(edits).length > 0;
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  function updateBatch(value: ImportBatchView) { batchRef.current = value; setBatch(value); setMapping(value.mapping); setKind(value.kind); setStoreId(value.storeId || ""); }
  async function refresh(id = batchRef.current?.id) { if (id) updateBatch(await getImportBatch(id)); }
  function report(e: unknown) { setError(e instanceof Error ? e.message : "Something went wrong. Please try again."); }
  function canLeave() { if (!dirty) return true; setError("Save or discard your quick edits before opening another batch."); return false; }
  async function openBatch(id: string) { if (!canLeave()) return; setBusy("Opening batch…"); setError(""); try { updateBatch(await getImportBatch(id)); setSelected([]); setExpanded([]); setUpload(null); setQuery(""); setFilter("all"); } catch (e) { report(e); } finally { setBusy(""); } }
  async function readFile(file?: File) { if (!file || !canLeave()) return; setBusy("Reading spreadsheet…"); setError(""); try { const form = new FormData(); form.set("file", file); setUpload({ filename: file.name, sheets: await previewImportFile(form) }); setSheetIndex(0); setBatch(null); batchRef.current = null; setSelected([]); } catch (e) { report(e); } finally { setBusy(""); } }
  async function startBatch(overrideKind = kind, overrideSheet = sheetIndex, overrideStore = storeId) {
    if (!upload?.sheets[overrideSheet]) throw new Error("Upload a spreadsheet and choose a sheet first.");
    const b = await createImportBatch(overrideKind, upload.filename, upload.sheets[overrideSheet], overrideStore || null);
    updateBatch(b); setSelected(b.rows.map(row => row.id)); setExpanded([]); setUpload(null); setWorkspace(await getImportWorkspace()); setNotice("Your spreadsheet is saved. Check column matching, then import drafts."); return b;
  }
  function downloadTemplate(templateKind = activeKind) {
    const f = workspace.fields[templateKind] as ImportField[];
    const example: Values = templateKind === "vendor" ? { vendorName: "Sample Vendor", email: "vendor@example.com", name: "Sample Store", categoryId: "other", region: "Trinidad and Tobago" } : templateKind === "event" ? { title: "Sample Event", startDate: "2027-06-12T18:00:00-04:00", venueName: "Sample venue", ticketTypes: [{ name: "General admission", price: 100, quantity: 100 }] } : { name: templateKind === "product" ? "Sample Product" : "Sample Service", price: 100, ...(templateKind === "product" ? { sku: "SAMPLE-001", stock: 10 } : { serviceType: "QUOTE", quotePriceType: "FREE_QUOTE" }) };
    download(`linkwe-${templateKind}-template.csv`, csvText(f.map(field => field.name), [example]));
  }
  function exportRows(ids?: string[]) {
    const b = batchRef.current; if (!b) return;
    const rows = b.rows.filter(row => !ids?.length || ids.includes(row.id));
    const keys = [...new Set(rows.flatMap(row => Object.keys(row.values)))];
    download(`${b.kind}-import-results.csv`, csvText(["sourceRow", "importState", "recordId", "importNotes", ...keys], rows.map(row => ({ ...row.values, sourceRow: row.number, importState: row.state, recordId: row.recordId, importNotes: [row.note, ...Object.values(row.errors)].filter(Boolean).join(" · ") }))));
  }
  async function execute(command: ImportCommand): Promise<boolean> {
    const b = batchRef.current; if (!b) throw new Error("Open an import batch first.");
    cancelled.current = false;
    const versions = Object.fromEntries(b.rows.map(row => [row.id, row.version]));
    const full = { ...command, versions };
    if (REVIEW_OPERATIONS.includes(command.operation)) { setReview(await prepareImportReview(b.id, full)); receipts.current.push(`A review is ready for ${command.rowIds?.length || 0} rows. Those changes have not been applied yet.`); return true; }
    const results: ImportResult[] = [];
    const rowIds = command.rowIds || [];
    if (rowIds.length > 10 && !["undo", "map"].includes(command.operation)) {
      cancelled.current = false;
      for (let i = 0; i < rowIds.length && !cancelled.current; i += 10) {
        setBusy(`${operationLabels[command.operation] || "Saving"} · ${i} of ${rowIds.length}`);
        results.push(...await runImportCommand(b.id, { ...full, rowIds: rowIds.slice(i, i + 10) }));
        await refresh(b.id);
      }
    } else results.push(...await runImportCommand(b.id, full));
    await refresh(b.id);
    const failures = results.filter(r => !r.ok);
    receipts.current.push(`${operationLabels[command.operation] || (command.operation === "edit" ? "Save edits" : "Update batch")}: ${results.length - failures.length} completed${failures.length ? `; ${failures.length} need attention` : ""}.`);
    setNotice(`${results.length - failures.length} completed${failures.length ? ` · ${failures.length} need attention` : ""}${cancelled.current ? " · stopped; completed rows are saved" : ""}.`);
    if (failures.length) setError(failures.slice(0, 3).map(r => r.message).join(" "));
    if (command.operation === "edit") setEdits(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => !results.some(r => r.rowId === id && r.ok))));
    if (failures.length) throw new Error(`${results.length - failures.length} completed; ${failures.length} need attention. ${failures.slice(0, 3).map(r => r.message).join(" ")}`);
    return false;
  }
  async function action(command: ImportCommand) { setBusy("Saving…"); setError(""); try { await execute(command); } catch (e) { report(e); } finally { setBusy(""); } }
  async function finishReview() {
    if (!review) return; setRexPhase("working"); setBusy("Applying reviewed changes…"); setError("");
    try {
      const results: ImportResult[] = []; cancelled.current = false;
      for (let offset = 0; offset < review.rows.length && !cancelled.current; offset += 10) {
        setBusy(`Applying reviewed changes · ${offset} of ${review.rows.length}`);
        results.push(...await confirmImportReview(review.token, offset)); await refresh();
      }
      const failures = results.filter(r => !r.ok), resultText = `${results.length - failures.length} completed; ${failures.length} need attention${cancelled.current ? "; stopped after current group" : ""}.`;
      setNotice(resultText); setChat(previous => [...previous, { role: "assistant", content: resultText + (failures.length ? ` ${failures.slice(0, 3).map(r => r.message).join(" ")}` : "") }]); setReview(null);
      if (failures.length || cancelled.current) { setRexPhase(failures.length ? "error" : "done"); if (failures.length) setError(failures.map(r => r.message).slice(0, 3).join(" ")); pendingSteps.current = []; } else { setRexPhase("done"); await performSteps(pendingSteps.current.splice(0)); }
    } catch (e) { report(e); setRexPhase("error"); pendingSteps.current = []; } finally { setBusy(""); }
  }
  async function addPhotos(files: File[], rowId?: string) {
    const b = batchRef.current; if (!b || !files.length) return;
    setBusy("Uploading photos…"); setError("");
    try {
      const currentRow = b.rows.find(row => row.id === rowId);
      const existing = currentRow ? photos(b.kind, { ...currentRow.values, ...(edits[rowId!] || {}) }) : [];
      if (rowId && edits[rowId]) throw new Error("Save the quick edits for this row before uploading photos.");
      const allowed = rowId ? 20 - existing.length : 100;
      if (files.length > allowed) throw new Error(rowId ? `There is room for ${allowed} more photos in this row.` : "Upload up to 100 photos at a time.");
      const result = await compressAndUploadImages(files, form => uploadImportPhoto(b.id, form), { onProgress: (done, total) => setBusy(`Uploading photos · ${done} of ${total}`) });
      await refresh();
      if (rowId && result.urls.length) await execute({ operation: "edit", rowIds: [rowId], patch: photoPatch(b.kind, [...existing, ...result.urls]) });
      if (result.error) throw new Error(result.error);
      if (!rowId) openPhotoMatching(batchRef.current!);
    } catch (e) { report(e); } finally { setBusy(""); }
  }
  function openPhotoMatching(b = batchRef.current) {
    if (!b) return;
    if (dirty) { setError("Save or discard your quick edits before assigning photographs."); return; }
    setError("");
    let remembered = photoDestinations.current[b.id] || "";
    try { remembered ||= sessionStorage.getItem(`import-photo-destination:${b.id}`) || ""; } catch {}
    if (!remembered && selected.length === 1) remembered = selected[0];
    setPhotoDestination(b.rows.some(r => r.id === remembered && r.state !== "removed") ? remembered : "");
    setAssetMatch(Object.fromEntries(b.assets.map(asset => {
      const attached = b.rows.some(row => photos(b.kind, row.values).includes(asset.url));
      const saved = photoDrafts.current[b.id]?.[asset.id];
      const matches = attached ? [] : photoMatches(asset.name, b.rows.filter(r => r.state !== "removed"), b.kind);
      return [asset.id, saved !== undefined ? saved : matches.length === 1 ? matches[0] : ""];
    })));
  }
  async function applyPhotoMatches() {
    const b = batchRef.current; if (!b || !assetMatch) return;
    setBusy("Assigning photographs…"); setError("");
    try {
      if (dirty) throw new Error("Save or discard your quick edits before assigning photographs.");
      const plans = planPhotoAssignments(batchRef.current!, assetMatch);
      for (const plan of plans) {
        await execute({ operation: "edit", rowIds: [plan.id], patch: plan.patch });
        setAssetMatch(previous => previous && Object.fromEntries(Object.entries(previous).map(([asset, row]) => [asset, row === plan.id ? "" : row])));
      }
      photoDrafts.current[b.id] = {};
      setNotice(`${plans.reduce((sum, plan) => sum + plan.added, 0)} photos attached across ${plans.length} destinations.`);
      setAssetMatch(null);
    } catch (e) { report(e); } finally { setBusy(""); }
  }
  async function performSteps(steps: ImportAssistantStep[]) {
    let nextSheet = sheetIndex;
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index]; setRexPhase("working"); setBusy(step.type === "command" ? `${operationLabels[step.command.operation] || "Saving your edits"}…` : "Updating your workspace…");
      if (step.type === "command") { if (await execute(step.command)) { pendingSteps.current = steps.slice(index + 1); setRexPhase("review"); return; } }
      else if (step.action === "select") setSelected((step.rowIds || []).filter(id => batchRef.current?.rows.some(r => r.id === id)));
      else if (step.action === "expand") setExpanded((step.rowIds || []).filter(id => batchRef.current?.rows.some(r => r.id === id)));
      else if (step.action === "export") exportRows(step.rowIds);
      else if (step.action === "template") downloadTemplate(step.kind || kind);
      else if (step.action === "load_batch" && step.id) await openBatch(step.id);
      else if (step.action === "choose_sheet" && step.index != null && upload?.sheets[step.index]) { setSheetIndex(step.index); nextSheet = step.index; }
      else if (step.action === "create_batch") await startBatch(step.kind || kind, nextSheet, step.id || storeId);
      else if (step.action === "match_photos") openPhotoMatching();
    }
    setRexPhase("done");
  }
  async function ask(event: React.FormEvent) {
    event.preventDefault(); if (!question.trim() || aiBusy || busy || fieldUploads > 0) return;
    if (dirty) { setError("Save or discard your quick edits so Rex works with the latest saved details."); return; }
    const text = question; setQuestion(""); setAiBusy(true); setRexPhase("thinking"); setError(""); setChat(previous => [...previous, { role: "user", content: text }]);
    try {
      const response = await askBulkImportAssistant({ question: text, batchId: batchRef.current?.id || null, selected, history: chat, ...(upload ? { upload: { filename: upload.filename, sheets: upload.sheets.map(s => s.name), selectedSheet: sheetIndex, kind, storeId: storeId || null } } : {}) });
      setChat(previous => [...previous, { role: "assistant", content: response.answer }]); receipts.current = []; await performSteps(response.steps);
      if (!pendingSteps.current.length && !response.steps.some(step => step.type === "command" && REVIEW_OPERATIONS.includes(step.command.operation))) setRexPhase("done");
      if (receipts.current.length) setChat(previous => [...previous, { role: "assistant", content: receipts.current.join("\n"), outcome: response.steps.some(step => step.type === "command" && REVIEW_OPERATIONS.includes(step.command.operation)) ? "review" : "success" }]);
    } catch (e) { const message = e instanceof Error ? e.message : "Rex could not complete that request."; setChat(previous => [...previous, { role: "assistant", content: message, outcome: "error" }]); setRexPhase("error"); } finally { setAiBusy(false); setBusy(""); }
  }
  const shownRows = batch?.rows.filter(row => (!query || `${rowTitle(activeKind, row.values)} ${row.values.email || ""} ${row.values.sku || ""}`.toLowerCase().includes(query.toLowerCase())) && (filter === "all" || filter === "attention" ? filter !== "attention" || Object.keys(row.errors).length > 0 : row.state === filter)) || [];
  const locked = !!busy || aiBusy || fieldUploads > 0;
  const stats = batch ? { total: batch.rows.length, created: batch.rows.filter(r => r.createdRecord && r.state !== "removed").length, skipped: batch.rows.filter(r => r.state === "skipped").length, attention: batch.rows.filter(r => Object.keys(r.errors).length).length } : null;
  return <div className={s.workspace}>
    <div className={s.breadcrumb}><Link href="/dashboard/admin/onboarding"><ArrowLeft size={14}/>Creation Studio</Link><span>/</span><span>Bulk import</span></div>
    <header className={s.header}><div><p className={s.eyebrow}>A LITTLE LESS ADMIN. A LOT MORE POSSIBILITY.</p><h1>Your next batch<br/><span>starts here.</span></h1><p>Bring your spreadsheet. Build the details together.<br/>Everything begins as a draft.</p></div><div className={s.headerMark}><FileSpreadsheet size={45}/><span>UPLOAD → REFINE → PUBLISH</span></div></header>
    <div className={s.layout}><main className={s.main}>
      <div className={s.topTools}><div className={s.segment} aria-label="Import destination"><button disabled={locked} aria-pressed={kind === "vendor"} onClick={() => { if (!canLeave()) return; setKind("vendor"); setBatch(null); batchRef.current = null; setUpload(null); }}>Vendors & stores</button><button disabled={locked} aria-pressed={kind !== "vendor"} onClick={() => { if (!canLeave()) return; setKind("product"); setBatch(null); batchRef.current = null; setUpload(null); }}>Products, services & events</button></div><button className={s.secondary} disabled={locked} onClick={() => { if (!canLeave()) return; setBatch(null); batchRef.current = null; setUpload(null); setSelected([]); }}><Plus size={15}/>New batch</button></div>
      <div className={s.saved}><History size={16}/><select className={s.input} aria-label="Open a saved batch" value={batch?.id || ""} disabled={locked} onChange={e => e.target.value && void openBatch(e.target.value)}><option value="">Return to a saved batch</option>{workspace.batches.map(b => <option key={b.id} value={b.id}>{b.filename} · {labels[b.kind as ImportKind]} · {b._count.rows} rows</option>)}</select></div>
      {error && <div className={s.errorBanner} role="alert">{error}<button className={s.icon} aria-label="Dismiss error" onClick={() => setError("")}><X size={16}/></button></div>}
      {(busy || notice) && <div className={s.notice} role="status">{busy ? <LoaderCircle size={15} className={s.spin}/> : <Check size={15}/>}<span>{busy || notice}</span>{busy.includes("of") && <button onClick={() => { cancelled.current = true; }} className={s.textButton}>Stop after current group</button>}</div>}
      {!batch && <section className={s.card}><div className={s.sectionHead}><span className={s.step}>01</span><div><h2>Bring it all in</h2><p>{kind === "vendor" ? "Vendor accounts and their stores, in one separate upload." : "Add offerings to an existing store from the Creation Zone."}</p></div></div>{kind !== "vendor" && <div className={s.setup}><label className={s.field}><span>What are you importing?</span><select className={s.input} value={kind} disabled={locked} onChange={e => setKind(e.target.value as ImportKind)}>{IMPORT_KINDS.filter(k => k !== "vendor").map(k => <option value={k} key={k}>{labels[k]}</option>)}</select></label><label className={s.field}><span>Default store</span><select className={s.input} value={storeId} disabled={locked} onChange={e => setStoreId(e.target.value)}><option value="">Match stores from the spreadsheet</option>{workspace.stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label></div>}
        <div className={s.dropzone} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!locked) void readFile(e.dataTransfer.files[0]); }}><span className={s.uploadIcon}><UploadCloud size={32}/></span><h3>Drop your spreadsheet here</h3><p>CSV, TSV or Excel (.xlsx) · up to 500 rows per sheet · 4 MB</p><button className={s.primary} disabled={locked} onClick={() => fileInput.current?.click()}>Choose a file<ArrowRight size={16}/></button><input ref={fileInput} className={s.hidden} type="file" accept=".csv,.tsv,.xlsx" onChange={e => { void readFile(e.target.files?.[0]); e.target.value = ""; }}/></div>
        <div className={s.template}><div><strong>Start with a little structure.</strong><p>Templates include every supported field. Fill only what you have.</p></div><button className={s.secondary} onClick={() => downloadTemplate()}><Download size={15}/>Get template</button></div>
        <p className={s.hint}>Prices use TTD. Dates use YYYY-MM-DD and local times use Trinidad & Tobago. Use | between list entries. Paste spreadsheet formulas as values before uploading.</p>
        {upload && <div className={s.sheet}><div className={s.between}><strong>{upload.filename}</strong><span>{upload.sheets[sheetIndex]?.rows.length} rows</span></div><label className={s.field}><span>Choose an Excel sheet</span><select className={s.input} value={sheetIndex} disabled={locked} onChange={e => setSheetIndex(Number(e.target.value))}>{upload.sheets.map((sheet, i) => <option value={i} key={sheet.name}>{sheet.name} · {sheet.rows.length} rows</option>)}</select></label><div className={s.preview}>{upload.sheets[sheetIndex]?.headers.slice(0, 8).map(header => <span key={header}>{header}</span>)}</div><button className={s.primary} disabled={locked} onClick={async () => { setBusy("Saving your batch…"); try { await startBatch(); } catch (e) { report(e); } finally { setBusy(""); } }}>Save batch & review columns<ArrowRight size={16}/></button></div>}
      </section>}
      {batch && <><section className={s.card}><div className={s.sectionHead}><span className={s.step}>02</span><div><h2>{batch.filename}</h2><p>{labels[batch.kind]} · {batch.sheet} · saved automatically after each action</p></div><button className={s.icon} aria-label="Export this batch" onClick={() => exportRows()}><Download size={19}/></button></div><div className={s.stats}>{Object.entries(stats!).map(([label, count]) => <div key={label}><strong>{count}</strong><span>{label === "attention" ? "Needs attention" : label === "total" ? "Rows in batch" : label === "created" ? "Created" : "Existing skipped"}</span></div>)}</div>
        <details className={s.mapping} open={!batch.rows.some(r => r.recordId)}><summary>Column matching <span>{Object.values(mapping).filter(Boolean).length} fields matched</span><ChevronDown size={16}/></summary><p className={s.hint}>Match your headings to LinkWe fields. Unmatched columns stay in the original row. Rematching replaces edits in rows that have not been imported; imported records must be edited individually.</p>{batch.kind !== "vendor" && <label className={s.field}><span>Default store for rows without a store ID</span><select className={s.input} disabled={locked || batch.rows.some(r => r.recordId)} value={storeId} onChange={e => setStoreId(e.target.value)}><option value="">Match from each row</option>{workspace.stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>}<div className={s.mapGrid}>{batch.headers.map(header => <label key={header}><span title={header}>{header}</span><ArrowRight size={14}/><select className={s.input} value={mapping[header] || ""} disabled={locked || batch.rows.some(r => r.recordId)} onChange={e => setMapping({ ...mapping, [header]: e.target.value })}><option value="">Keep as source only</option>{fields.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}</select></label>)}</div><button className={s.secondary} disabled={locked || batch.rows.some(r => r.recordId) || dirty} onClick={() => void action({ operation: "map", mapping, storeId: storeId || null })}>Save column matching</button></details>
      </section>
      <section className={s.card}><div className={s.sectionHead}><span className={s.step}>03</span><div><h2>Make each one yours</h2><p>Expand a row to quick-edit any field or drop in its photos.</p></div></div><div className={s.filters}><label className={s.search}><Search size={16}/><input placeholder="Find a name, email or SKU…" aria-label="Search imported rows" value={query} onChange={e => { setQuery(e.target.value); setLimit(30); }}/></label><select className={s.input} aria-label="Filter imported rows" value={filter} onChange={e => { setFilter(e.target.value); setLimit(30); }}><option value="all">All rows</option><option value="attention">Needs attention</option><option value="ready">Ready to import</option><option value="created">Created drafts</option><option value="failed">Failed imports</option><option value="skipped">Existing skipped</option><option value="published">Published</option><option value="archived">Archived</option><option value="removed">Removed</option></select></div>
        <div className={s.batchToolbar}><label className={s.check}><input type="checkbox" aria-label="Select all filtered rows" checked={shownRows.length > 0 && shownRows.every(r => selected.includes(r.id))} onChange={e => setSelected(e.target.checked ? [...new Set([...selected, ...shownRows.map(r => r.id)])] : selected.filter(id => !shownRows.some(r => r.id === id)))}/>{selected.length ? `${selected.length} selected` : "Select rows"}</label><div className={s.toolbarButtons}><button className={s.secondary} disabled={locked || dirty || !selected.length} onClick={() => void action({ operation: "check", rowIds: selected })}>Check rows</button><button className={s.primary} disabled={locked || dirty || !selected.length} onClick={() => void action({ operation: "import", rowIds: selected })}>Import drafts<ArrowDown size={14}/></button><button className={s.secondary} disabled={locked || !selected.length} onClick={() => { setBulkField(fields.find(f => !f.lookup)?.name || ""); setBulkValue(null); setShowBulk(true); }}>Quick edit selected</button><select className={s.input} aria-label="More batch actions" value="" disabled={locked || dirty || !selected.length} onChange={e => { if (e.target.value === "export") exportRows(selected); else if (e.target.value) void action({ operation: e.target.value as ImportCommand["operation"], rowIds: selected }); }}><option value="">More actions…</option>{Object.entries(operationLabels).filter(([op]) => op !== "import" && (op !== "invite" || batch.kind === "vendor")).map(([op, label]) => <option key={op} value={op}>{label}</option>)}<option value="export">Export selected rows</option></select></div></div>
        <div className={s.utility}><button className={s.textButton} disabled={locked} onClick={() => { setSelected(batch.rows.filter(r => r.state === "failed").map(r => r.id)); setFilter("failed"); }}>Select failed rows to retry</button><button className={s.textButton} onClick={() => setExpanded(expanded.length ? [] : shownRows.slice(0, limit).map(r => r.id))}>{expanded.length ? "Collapse all" : "Expand visible rows"}</button></div>
        <div className={s.rows}>{shownRows.slice(0, limit).map(row => <ImportRow key={row.id} row={row} kind={batch.kind} fields={fields} stores={workspace.stores} vendors={workspace.vendors} onFieldUpload={onFieldUpload} checked={selected.includes(row.id)} expanded={expanded.includes(row.id)} edit={edits[row.id]} busy={locked} onSelect={() => setSelected(selected.includes(row.id) ? selected.filter(id => id !== row.id) : [...selected, row.id])} onToggle={() => setExpanded(expanded.includes(row.id) ? expanded.filter(id => id !== row.id) : [...expanded, row.id])} onChange={(key, value) => setEdits(previous => ({ ...previous, [row.id]: { ...(previous[row.id] || {}), [key]: value } }))} onDiscard={() => setEdits(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => id !== row.id)))} onSave={() => void action({ operation: "edit", rowIds: [row.id], patch: edits[row.id] || {} })} onPhotos={files => void addPhotos(files, row.id)} onAction={operation => void action({ operation, rowIds: [row.id] })}/>)}{!shownRows.length && <div className={s.empty}>No rows match this view. Try another filter.</div>}</div>{shownRows.length > limit && <button className={s.secondary} onClick={() => setLimit(limit + 30)}>Show 30 more rows<ChevronDown size={15}/></button>}
      </section>
      <section className={`${s.card} ${s.photoBank}`}><div className={s.sectionHead}><ImagePlus size={23}/><div><h2>A folder full of finishing touches</h2><p>Upload photos together, then review matches by filename, SKU or name.</p></div></div><div className={s.photoDrop} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!locked) void droppedImportPhotos(e.dataTransfer).then(files => addPhotos(files)).catch(report); }}><UploadCloud size={23}/><span>Drop multiple photos here</span><label className={s.secondary}>Choose photos<input type="file" className={s.hidden} accept="image/jpeg,image/png,image/webp" multiple disabled={locked} onChange={e => { if (e.target.files) void addPhotos(Array.from(e.target.files)); e.target.value = ""; }}/></label><label className={s.secondary}>Choose folder<input type="file" className={s.hidden} {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)} multiple disabled={locked} onChange={e => { if (e.target.files) void addPhotos(Array.from(e.target.files).filter(f => f.type.startsWith("image/"))); e.target.value = ""; }}/></label></div>{batch.assets.length > 0 && <button className={s.textButton} disabled={locked || dirty} onClick={() => openPhotoMatching()}>Review {batch.assets.length} uploaded photographs<ArrowRight size={14}/></button>}</section>
      <button className={s.historyButton} onClick={() => setShowHistory(true)}><History size={16}/>View change history & undo<ArrowRight size={15}/></button></>}
    </main>
    <aside className={s.rexAside}><RexConversation title="Rex, your import partner" subtitle="Import, refine, organise photos and manage your batch together." messages={chat} question={question} onQuestion={setQuestion} onSubmit={ask} phase={review && !busy ? "review" : rexPhase} activity={busy || undefined} disabled={locked || !!review} suggestions={batch ? ["Check this batch for missing information.", "Match my spreadsheet columns.", "Import all ready rows as drafts."] : ["What columns do I need?", "Download a vendor template."]} footnote="Drafts stay private. Publishing, updating existing records, invitations and removal show a review first."/></aside></div>
    {review && <AdminDialog title={operationLabels[review.operation] || "Review changes"} onClose={() => { if (!busy) { setReview(null); setRexPhase("idle"); pendingSteps.current = []; } }}><p className={s.hint}>{review.operation === "publish" ? "These records will become visible if all required details are complete." : review.operation === "invite" ? "Send each vendor a secure, one-hour password setup link. No passwords are emailed." : review.operation === "delete" ? "Only drafts created by this batch can be removed. Existing records, accounts and records with linked activity are protected. Removal cannot be undone." : "Apply the saved spreadsheet values to these existing records. Their current publication state stays the same."}</p><ul className={s.reviewList}>{review.rows.map(row => <li key={row.id}><span>Row {row.number}</span><strong>{row.name}</strong>{row.email && <small>{row.email}</small>}</li>)}</ul><div className={s.dialogButtons}><button className={s.secondary} disabled={!!busy} onClick={() => { setReview(null); setRexPhase("idle"); pendingSteps.current = []; }}>Cancel</button><button className={s.primary} disabled={!!busy} onClick={() => void finishReview()}>{busy ? "Applying…" : `Confirm for ${review.rows.length} rows`}</button></div></AdminDialog>}
    {showBulk && <AdminDialog title={`Quick edit ${selected.length} selected rows`} onClose={() => setShowBulk(false)}><p className={s.hint}>Change one field across the selected rows. Other fields stay as they are.</p><select className={s.input} aria-label="Field to edit in bulk" value={bulkField} onChange={e => { setBulkField(e.target.value); setBulkValue(null); }}>{fields.filter(f => !f.lookup).map(f => <option value={f.name} key={f.name}>{f.label}</option>)}</select><div className={s.bulkValue}>{fields.find(f => f.name === bulkField) && <ImportFieldEditor key={bulkField} field={fields.find(f => f.name === bulkField)!} kind={activeKind} stores={workspace.stores} vendors={workspace.vendors} onBusy={onFieldUpload} disabled={locked} value={bulkValue} onChange={setBulkValue}/>}</div><button className={s.primary} disabled={locked || !bulkField} onClick={async () => { await action({ operation: "edit", rowIds: selected, patch: { [bulkField]: bulkValue } }); setShowBulk(false); }}>Apply to selected rows</button></AdminDialog>}
    {showHistory && batch && <AdminDialog title="Change history" onClose={() => setShowHistory(false)}><p className={s.hint}>Recent 200 actions. Undo checks for newer edits before restoring anything. Account invitations and removals cannot be undone.</p><div className={s.history}>{batch.changes.map(change => <div key={change.id}><div><strong>{change.summary}</strong><small>{new Date(change.createdAt).toLocaleString("en-TT", { timeZone: "America/Port_of_Spain" })}{change.undone ? " · undone" : ""}</small></div>{!change.undone && change.rowId && !["delete", "invite", "undo"].includes(change.action) && <button className={s.secondary} disabled={locked} onClick={() => void action({ operation: "undo", changeId: change.id })}>Undo</button>}</div>)}</div></AdminDialog>}
    {assetMatch && batch && <PhotoAssignmentDialog batch={batch} assignments={assetMatch} onChange={value => { setAssetMatch(value); photoDrafts.current[batch.id] = value; }} onApply={() => void applyPhotoMatches()} onClose={() => setAssetMatch(null)} busy={locked} error={error} destination={photoDestination} onDestination={rememberPhotoDestination}/>}

  </div>;
}

function ImportRow({ row, kind, fields, checked, expanded, edit, busy, onSelect, onToggle, onChange, onSave, onDiscard, onPhotos, onAction, stores, vendors, onFieldUpload }: { stores: Workspace["stores"]; vendors: Workspace["vendors"]; onFieldUpload: (pending: boolean) => void; row: ImportRowView; kind: ImportKind; fields: ImportField[]; checked: boolean; expanded: boolean; edit?: Values; busy: boolean; onSelect: () => void; onToggle: () => void; onChange: (key: string, value: unknown) => void; onSave: () => void; onDiscard: () => void; onPhotos: (files: File[]) => void; onAction: (operation: ImportCommand["operation"]) => void }) {
  const [fieldSearch, setFieldSearch] = useState("");
  const [showAllFields, setShowAllFields] = useState(false);
  const [dropError, setDropError] = useState("");
  const quickFields = ["vendorName", "email", "phone", "name", "title", "description", "price", "stock", "sku", "category", "categoryId", "region", "startDate", "endDate", "venueName", "serviceType", "serviceDuration"];
  const values = { ...row.values, ...edit }, urls = photos(kind, values);
  const title = rowTitle(kind, values), issueCount = Object.keys(row.errors).length;
  const mediaFields = kind === "vendor" ? ["storeGallery", "coverPhotoUrl"] : kind === "event" ? ["coverImage", "galleryImages"] : ["images"];
  const visible = fields.filter(f => !mediaFields.includes(f.name) && (fieldSearch ? `${f.label} ${f.name}`.toLowerCase().includes(fieldSearch.toLowerCase()) : showAllFields || quickFields.includes(f.name)));
  const patchPhotos = (next: string[]) => Object.entries(photoPatch(kind, next)).forEach(([key, value]) => onChange(key, value));
  return <article className={s.row} data-expanded={expanded}><div className={s.rowHead}><input type="checkbox" aria-label={`Select ${title}`} checked={checked} onChange={onSelect}/><button className={s.rowToggle} onClick={onToggle} aria-expanded={expanded} aria-controls={`row-${row.id}`}><span className={s.rowThumb}>{urls[0] ? <img src={urls[0]} alt=""/> : kind === "vendor" ? <Store size={20}/> : <ImagePlus size={20}/>}</span><span className={s.rowName}><strong>{title}{edit && <i>Unsaved</i>}</strong><small>Row {row.number} · {kind === "vendor" ? String(values.email || "Add vendor email") : String(values.sku || values.storeSlug || "Draft offering")}</small></span><span className={s.state} data-state={row.state}>{row.state === "ready" ? "Awaiting import" : row.state === "created" ? "Draft" : row.state === "failed" ? "Needs attention" : row.state}</span><ChevronDown className={expanded ? s.rotated : ""} size={17}/></button></div>{expanded && <div className={s.rowBody} id={`row-${row.id}`}>
    {(issueCount > 0 || row.note) && <div className={s.rowNotice}>{row.note && <p>{row.note}</p>}{issueCount > 0 && <ul>{Object.entries(row.errors).map(([field, message]) => <li key={field}><strong>{fields.find(f => f.name === field)?.label || "Review"}:</strong> {message}</li>)}</ul>}</div>}
    <div className={s.rowMedia}>{dropError && <p role="alert" className={s.error}>{dropError}</p>}<div className={s.between}><h3>Photos & cover</h3><small>{urls.length}/20 photos</small></div><div className={s.gallery}>{urls.map((url, i) => <div key={`${url}-${i}`}><img src={url} alt={`${title}, photo ${i + 1}`}/><span>{i === 0 ? "COVER" : i + 1}</span><div><button type="button" className={s.icon} disabled={busy || i === 0} aria-label={`Make photo ${i + 1} cover`} onClick={() => patchPhotos([url, ...urls.filter((_, index) => index !== i)])}><Check size={13}/></button><button type="button" className={s.icon} disabled={busy || i === urls.length - 1} aria-label={`Move photo ${i + 1} later`} onClick={() => { const next = [...urls]; [next[i], next[i + 1]] = [next[i + 1], next[i]]; patchPhotos(next); }}><ArrowRight size={13}/></button><button type="button" className={s.icon} disabled={busy} aria-label={`Remove photo ${i + 1}`} onClick={() => patchPhotos(urls.filter((_, index) => index !== i))}><X size={13}/></button></div></div>)}</div><div className={s.rowDrop} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!busy && row.state !== "removed") void droppedImportPhotos(e.dataTransfer).then(onPhotos).catch(e => setDropError(e instanceof Error ? e.message : "Could not read these photos.")); }}><ImagePlus size={20}/><span>Drop photos directly into this {kind === "vendor" ? "store" : kind}</span><label className={s.textButton}>or choose photos<input type="file" className={s.hidden} accept="image/jpeg,image/png,image/webp" multiple disabled={busy || row.state === "removed"} onChange={e => { if (e.target.files) onPhotos(Array.from(e.target.files)); e.target.value = ""; }}/></label></div><details><summary className={s.hint}>Use existing photo links</summary><textarea className={s.input} aria-label={`Photo links for ${title}`} rows={2} value={urls.join("\n")} onChange={e => patchPhotos(e.target.value.split("\n").map(v => v.trim()).filter(Boolean))}/></details></div>
    <label className={s.search}><Search size={15}/><input aria-label={`Find a field in ${title}`} placeholder="Find any field…" value={fieldSearch} onChange={e => setFieldSearch(e.target.value)}/></label><button type="button" className={s.textButton} onClick={() => setShowAllFields(!showAllFields)}>{showAllFields ? "Show quick fields" : `Show every field (${fields.length})`}</button><div className={s.fields}><fieldset disabled={busy || row.state === "removed"} className={s.fieldset}>{visible.map(field => <div key={field.name} className={`${s.field} ${field.list || field.type === "Json" || /description|policy|policies/i.test(field.name) ? s.wide : ""}`}><span>{field.label}{["price", "ticketPrice", "compareAtPrice", "depositAmount"].includes(field.name) ? " (TTD)" : ""}{field.type === "DateTime" ? " (UTC−04:00)" : ""}</span><ImportFieldEditor field={field} kind={kind} stores={stores} vendors={vendors} onBusy={onFieldUpload} value={values[field.name]} onChange={v => onChange(field.name, v)} disabled={busy || row.state === "removed" || !!row.recordId && !!field.lookup}/>{row.errors[field.name] && <small className={s.error}>{row.errors[field.name]}</small>}</div>)}</fieldset></div>
    <div className={s.rowFooter}><div><button className={s.primary} disabled={busy || !edit} onClick={onSave}>Save quick edits</button>{edit && <button className={s.textButton} disabled={busy} onClick={onDiscard}>Discard edits</button>}</div><button className={s.secondary} disabled={busy || !!edit} onClick={() => onAction(row.state === "skipped" ? "update_existing" : row.recordId ? "refresh" : "import")}>{row.state === "skipped" ? "Review update to existing" : row.recordId ? "Refresh saved details" : "Create this draft"}</button></div><details><summary className={s.hint}>Original spreadsheet row</summary><dl className={s.source}>{Object.entries(row.raw).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd></div>)}</dl></details>
  </div>}</article>;
}
