"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, PackageMinus, RefreshCw, ScanLine, Search, ShoppingBag, X } from "lucide-react";
import WorkspacePage from "@/components/vendor/WorkspacePage";
import { loadVendorStockCatalog, submitVendorStockAdjustment } from "@/app/actions/vendor-stock";
import { filterStockProducts, MAX_ADJUSTMENT_LINES, parseStockAdjustment, stockLineKey, stockOptions,
  type StockAdjustmentInput, type StockCatalog, type StockProduct, type StockReceipt } from "@/lib/vendor/stock/model";
import { selectScannedStockProduct } from "@/lib/vendor/stock/scan";
import { editStockDraft, isStockDraftStaged, newStockDraft, restoreStockSelection, stagedStockLines, stageStockDraft, stockSelectionError, stockStageError, type StockSelection } from "@/lib/vendor/stock/staging";
import StockQuantityEditor from "./StockQuantityEditor";
import StockQrScanner from "./StockQrScanner";
import StockUpgrade from "./StockUpgrade";
import s from "./stock-workspace.module.css";

export default function StockWorkspace({ initialCatalog }: { initialCatalog: StockCatalog }) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("all");
  const [limit, setLimit] = useState(24);
  const [selection, setSelection] = useState<StockSelection>({});
  const [reviewing, setReviewing] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<StockAdjustmentInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ready, setReady] = useState(false);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<StockReceipt | null>(null);
  const [replayed, setReplayed] = useState(false);
  const inFlight = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const scannedCard = useRef<HTMLElement>(null);
  const searchField = useRef<HTMLInputElement>(null);
  const storageKey = `linkwe:pending-stock-adjustment:${catalog.storeId}`;

  useEffect(() => {
    // Restore only unconfirmed requests after hydration; retaining their key prevents a second deduction after reload.
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const request = parseStockAdjustment(JSON.parse(saved));
        setPendingRequest(request);
        setSelection(restoreStockSelection(request.lines));
        setReviewing(true);
        setError("An earlier update needs confirmation. Retry it below; stock will only be deducted once.");
      }
      setReady(true);
    } catch { setError("Saved updates could not be read. Check your browser storage and recent updates before starting another adjustment."); }
  }, [storageKey]);

  const picks = Object.values(selection);
  const lines = pendingRequest?.lines ?? stagedStockLines(selection);
  const total = lines.reduce((sum, line) => sum + line.quantity, 0);
  const waitingCount = picks.filter(pick => !isStockDraftStaged(pick)).length;
  const validation = stockSelectionError(catalog.products, selection);
  const filtered = filterStockProducts(catalog.products, query, category, stock);
  const visible = [...filtered.filter(product => product.id === scannedId), ...filtered.filter(product => product.id !== scannedId)].slice(0, limit);
  const categories = [...new Set(catalog.products.map(product => product.category).filter((value): value is string => !!value))].sort();
  const selectable = visible.flatMap(product => stockOptions(product).filter(option => option.stock !== null && option.stock > 0).map(option => newStockDraft(product.id, option.variantId)));
  const allVisible = selectable.length > 0 && selectable.every(line => selection[stockLineKey(line.productId, line.variantId)]);
  const locked = busy || !!pendingRequest || !ready;

  function foundProduct(product: StockProduct) {
    if (locked || inFlight.current) return;
    setCatalog(current => ({ ...current, products: [...current.products.filter(item => item.id !== product.id), product]
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)) }));
    setSelection(current => selectScannedStockProduct(current, product));
    setQuery(""); setCategory(""); setStock("all"); setLimit(24);
    setScannedId(product.id); setScannerOpen(false); setReceipt(null); setError("");
    requestAnimationFrame(() => { scannedCard.current?.focus(); scannedCard.current?.scrollIntoView({ block: "center", behavior: "smooth" }); });
  }
  function closeScanner() {
    setScannerOpen(false);
    requestAnimationFrame(() => searchField.current?.focus());
  }

  function toggle(productId: string, variantId: string | null) {
    setReceipt(null); setError("");
    const key = stockLineKey(productId, variantId);
    setSelection(current => {
      const next = { ...current };
      if (next[key]) delete next[key];
      else if (Object.keys(next).length < MAX_ADJUSTMENT_LINES) next[key] = newStockDraft(productId, variantId);
      return next;
    });
  }
  function changeQuantity(key: string, quantity: string) {
    if (locked) return;
    setError("");
    setSelection(current => current[key] ? { ...current, [key]: editStockDraft(current[key], quantity) } : current);
  }
  function addToUpdate(key: string) {
    if (locked) return;
    const staged = stageStockDraft(catalog.products, selection, key);
    setError(staged.error ?? "");
    if (!staged.error) { setReceipt(null); setSelection(staged.selection); }
  }
  async function refresh() {
    setRefreshing(true);
    try {
      const fresh = await loadVendorStockCatalog();
      if (!fresh) throw new Error("Sign in to your vendor account to refresh stock.");
      if ("upgradeRequired" in fresh) { setUpgradeRequired(true); return; }
      setCatalog(fresh);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not refresh stock. Please try again."); }
    finally { setRefreshing(false); }
  }
  function forgetRequest() {
    try { localStorage.removeItem(storageKey); } catch { /* A stale key still replays safely. */ }
    setPendingRequest(null);
  }
  async function apply() {
    if (inFlight.current || (!pendingRequest && validation)) return;
    inFlight.current = true; setBusy(true); setError("");
    let request = pendingRequest;
    let persisted = !!pendingRequest;
    try {
      if (!request) {
        request = parseStockAdjustment({ storeId: catalog.storeId, requestId: crypto.randomUUID(), lines });
        // Persist before sending. If storage fails, nothing is submitted.
        localStorage.setItem(storageKey, JSON.stringify(request));
        persisted = true;
        setPendingRequest(request);
      }
      const result = await submitVendorStockAdjustment(request);
      if (!result.ok) {
        setError(result.error);
        if (result.upgradeRequired) setUpgradeRequired(true);
        if (!result.uncertain) { forgetRequest(); setReviewing(false); await refresh(); }
        return;
      }
      forgetRequest(); setReceipt(result.receipt); setReplayed(result.replayed); setSelection({}); setReviewing(false); setScannedId(null); setScannerOpen(false);
      await refresh();
    } catch {
      setError(persisted
        ? "The connection was interrupted. Retry this same update to confirm it safely."
        : "Browser storage is unavailable. Enable it before applying stock updates.");
    } finally { inFlight.current = false; setBusy(false); }
  }
  function beginReview() {
    if (locked || validation) return;
    setError(""); setReviewing(true); setScannerOpen(false);
    requestAnimationFrame(() => { heading.current?.focus(); heading.current?.scrollIntoView({ block: "start", behavior: "smooth" }); });
  }

  if (upgradeRequired) return <StockUpgrade />;
  return <WorkspacePage eyebrow={`${catalog.storeName} / Catalog / Pro`} title="Live stock update"
    description="Keep your catalog in step with your day. Select products sold offline or during a live session, add each quantity to your update, then review and reduce stock together."
    action={<Link href="/dashboard/vendor/creation?type=product" className={s.secondary}><ShoppingBag size={16} /> Manage products</Link>}>
    <div className={s.scope}><PackageMinus size={21} /><p><strong>Just your inventory.</strong> This update reduces stock only. It does not create an order, invoice or payment.</p></div>
    <ol className={s.steps} aria-label="Stock update steps"><li aria-current={!reviewing ? "step" : undefined}><span>1</span>Select & add quantities</li><li aria-current={reviewing ? "step" : undefined}><span>2</span>Review & reduce stock</li></ol>
    {error && <div className={s.error} role="alert">{error}</div>}
    {receipt && <section className={s.success} role="status"><Check size={23} /><div><h2>{replayed ? "Update already applied" : "Stock updated"}</h2><p>{receipt.totalQuantity} units deducted across {receipt.lines.length} stock {receipt.lines.length === 1 ? "item" : "items"}.</p><p className={s.reference}>Reference: {receipt.id}</p></div></section>}
    {reviewing ? <section className={s.panel}>
      <header className={s.sectionHeader}><div><p className={s.eyebrow}>CHECK YOUR QUANTITIES</p><h2 ref={heading} tabIndex={-1}>Review stock reduction</h2><p>{lines.length} stock items · {total} units {pendingRequest ? "in saved update" : "to deduct"}</p></div><button className={s.secondary} disabled={locked} onClick={() => setReviewing(false)}><ArrowLeft size={16} /> Edit selection</button></header>
      <p className={s.helper}>The whole batch is checked against current stock when you apply it. If any item has insufficient stock, nothing in this batch changes.</p>
      <div className={s.reviewList}>{lines.map(line => {
        const product = catalog.products.find(product => product.id === line.productId);
        const option = product && stockOptions(product).find(option => option.variantId === line.variantId);
        const sameProductTotal = lines.filter(item => item.productId === line.productId).reduce((sum, item) => sum + item.quantity, 0);
        const variant = product?.variants.find(item => item.id === line.variantId);
        const remainingLimits = [product?.stock == null ? null : product.stock - sameProductTotal, variant?.stock == null ? null : variant.stock - line.quantity].filter((value): value is number => value !== null);
        const remaining = remainingLimits.length ? Math.min(...remainingLimits) : null;
        return <article key={stockLineKey(line.productId, line.variantId)} className={s.reviewRow}><div><h3>{product?.name ?? "Previously selected product"}</h3><p>{option?.label ?? "Previously selected option"}</p>{product?.variants.length ? <small>Shared product stock: {product.stock === null ? "unlimited" : pendingRequest ? `${product.stock} currently` : `${product.stock} → ${product.stock - sameProductTotal}`}</small> : null}</div><div className={s.reviewNumbers}><strong>−{line.quantity}</strong><span>{pendingRequest ? "Awaiting confirmation" : option?.stock == null ? "Unavailable" : `${option.stock} → ${remaining} available`}</span></div></article>;
      })}</div>
      <footer className={s.reviewFooter}><p>{pendingRequest ? "This request is saved. Retry to confirm its result without deducting twice." : "Stock will be reduced immediately. Please check each quantity before applying."}</p><button className={s.primary} disabled={busy || !ready || (!pendingRequest && !!validation)} onClick={() => void apply()}>{busy ? "Confirming stock update…" : pendingRequest ? "Retry saved update" : `Reduce stock by ${total} units`}<Check size={17} /></button></footer>
    </section> : <section className={s.panel}>
      <header className={s.sectionHeader}><div><p className={s.eyebrow}>YOUR PRODUCT CATALOG</p><h2>What needs updating?</h2><p>Choose the exact option, enter its quantity and tap Add to update. Stock changes only after final confirmation.</p></div><button className={s.secondary} disabled={refreshing || locked} onClick={() => void refresh()}><RefreshCw size={16} className={refreshing ? s.spin : ""} />{refreshing ? "Refreshing…" : "Refresh stock"}</button></header>
      <div className={s.scanLaunch}><button type="button" className={s.secondary} disabled={locked} aria-expanded={scannerOpen} onClick={() => setScannerOpen(current => !current)}><ScanLine size={18} />{scannerOpen ? "Close scanner" : "Scan product QR"}</button><p>Use your QR Studio labels, or search below. Internet is needed to check and update stock.</p></div>
      {scannerOpen && !locked && <StockQrScanner storeId={catalog.storeId} onProduct={foundProduct} onClose={closeScanner} />}
      <div className={s.toolbar}><label className={s.search}><Search size={18} /><input ref={searchField} aria-label="Search catalog" placeholder="Search products, SKU, size or colour…" value={query} onChange={event => { setQuery(event.target.value); setLimit(24); }} />{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}</label><label className={s.filter}>Category<select value={category} onChange={event => { setCategory(event.target.value); setLimit(24); }}><option value="">All categories</option>{categories.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><label className={s.filter}>Stock<select value={stock} onChange={event => { setStock(event.target.value); setLimit(24); }}><option value="all">All stock</option><option value="available">Available to reduce</option><option value="out">Out of stock</option><option value="untracked">Unlimited stock</option></select></label></div>
      <div className={s.selectionLine}><label><input type="checkbox" checked={allVisible} disabled={locked || !selectable.length} onChange={() => setSelection(current => {
        const next = { ...current };
        for (const line of selectable) { const key = stockLineKey(line.productId, line.variantId); if (allVisible) delete next[key]; else if (!next[key] && Object.keys(next).length < MAX_ADJUSTMENT_LINES) next[key] = line; }
        return next;
      })} /> Select visible options</label><span>{filtered.length} products · {lines.length} added · {waitingCount} to confirm</span></div>
      <fieldset disabled={locked} className={s.catalog}><legend className={s.srOnly}>Choose stock items and quantities to deduct</legend>{visible.map(product => <article className={s.product} key={product.id} data-scanned={product.id === scannedId} ref={product.id === scannedId ? scannedCard : undefined} tabIndex={product.id === scannedId ? -1 : undefined} aria-label={product.id === scannedId ? `Scanned product: ${product.name}` : undefined}>
        {product.id === scannedId && <p className={s.scanFound} role="status"><ScanLine size={16} /><span>Label found. {product.hasVariants || product.variants.length ? "Choose the exact option below." : "Check the quantity, then add it to your update."} Scanning again keeps any quantity you already entered.</span></p>}
        <header className={s.productHeader}>{product.image ? <Image src={product.image} width={72} height={72} alt="" unoptimized /> : <span className={s.placeholder}><ShoppingBag size={25} /></span>}<div><span className={s.badge}>{product.published ? "Published" : "Draft"}</span><h3>{product.name}</h3><p>{product.sku ? `SKU ${product.sku} · ` : ""}{product.category?.replaceAll("_", " ") || "Uncategorised"}</p></div></header>
        {product.variants.length > 0 && <p className={s.shared}>Shared product stock: <strong>{product.stock === null ? "Unlimited" : product.stock}</strong></p>}
        <div className={s.options}>{stockOptions(product).map(option => {
          const key = stockLineKey(product.id, option.variantId); const picked = selection[key]; const eligible = option.stock !== null && option.stock > 0;
          return <div className={s.option} data-selected={!!picked} data-staged={!!picked && isStockDraftStaged(picked)} key={key}>
            <label className={s.optionSelect}><input type="checkbox" aria-label={`Select ${product.name}, ${option.label}`} checked={!!picked} disabled={!picked && (!eligible || picks.length >= MAX_ADJUSTMENT_LINES)} onChange={() => toggle(product.id, option.variantId)} /><span><strong>{option.label}</strong><small>{option.stock === null ? "Unlimited stock · set a quantity to track it" : option.stock === 0 ? "Out of stock" : `${option.stock} available`}</small></span></label>
            {picked && <StockQuantityEditor draft={picked} productName={product.name} optionLabel={option.label} available={option.stock}
              error={stockStageError(catalog.products, selection, key)} disabled={locked} onQuantityChange={quantity => changeQuantity(key, quantity)} onAdd={() => addToUpdate(key)} />}
          </div>;
        })}</div>
        {!stockOptions(product).length && <p className={s.helper}>Add size or colour options in the product editor before updating stock.</p>}
        <Link className={s.editLink} href={`/dashboard/vendor/creation/product/${product.id}`}>Edit product & stock <ArrowRight size={13} /></Link>
      </article>)}</fieldset>
      {!filtered.length && <div className={s.empty}><PackageMinus size={34} /><h3>{catalog.products.length ? "No products match" : "Your stock catalog starts here"}</h3><p>{catalog.products.length ? "Try another search or filter." : "Add physical products in Creation Zone, then manage their stock here."}</p>{catalog.products.length ? <button className={s.secondary} onClick={() => { setQuery(""); setCategory(""); setStock("all"); }}>Reset filters</button> : <Link href="/dashboard/vendor/creation/new?type=product" className={s.primary}>Add a product</Link>}</div>}
      {filtered.length > limit && <button className={s.loadMore} onClick={() => setLimit(current => current + 24)}>Show more products</button>}
    </section>}
    {!reviewing && picks.length > 0 && <div className={s.selectionBar}><div><strong>{lines.length} stock {lines.length === 1 ? "item" : "items"} added · {total} units</strong><p aria-live="polite">{validation || "Ready to review. Stock changes only after final confirmation."}</p></div><div><button className={s.secondary} disabled={locked} onClick={() => setSelection({})}>Clear</button><button className={s.primary} disabled={locked || !!validation} onClick={beginReview}>Review update <ArrowRight size={17} /></button></div></div>}
    <section className={`${s.panel} ${s.history}`}><header className={s.sectionHeader}><div><p className={s.eyebrow}>INVENTORY HISTORY</p><h2>Recent stock updates</h2><p>Your last 10 live or offline stock reductions.</p></div></header>{catalog.recent.length ? catalog.recent.map(item => <details key={item.id}><summary><span><strong>{item.totalQuantity} units reduced</strong><small>{new Date(item.createdAt).toLocaleString("en-GB", { timeZone: "America/Port_of_Spain", dateStyle: "medium", timeStyle: "short" })} · Trinidad time</small></span><span>{item.lines.length} stock items</span></summary><ul>{item.lines.map(line => <li key={stockLineKey(line.productId, line.variantId)}><span>{line.productName}{line.variantName ? ` · ${line.variantName}` : ""}<small>Product stock: {line.productStockBefore === null ? "unlimited" : `${line.productStockBefore} → ${line.productStockAfter}`}{line.variantId ? ` · Option: ${line.variantStockBefore === null ? "unlimited" : `${line.variantStockBefore} → ${line.variantStockAfter}`}` : ""}</small></span><strong>−{line.quantity}</strong></li>)}</ul><p className={s.reference}>Reference: {item.id}</p></details>) : <p className={s.helper}>Updates will appear here after you reduce stock.</p>}</section>
  </WorkspacePage>;
}
