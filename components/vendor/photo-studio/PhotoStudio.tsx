"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import imageCompression from "browser-image-compression";
import { ArrowDownToLine, ArrowRight, Check, CheckCheck, Grid3X3, ImagePlus, LoaderCircle, RotateCcw, ShieldCheck, SlidersHorizontal, Sparkles, Sun, Upload, X, ZoomIn } from "lucide-react";
import { DEFAULT_ADJUSTMENTS, FULL_CROP, type PhotoAdjustments } from "@/lib/photo-studio/adjustments";
import { renderAdjustments } from "./render-adjustments";
import PhotoZoom from "./PhotoZoom";
import s from "./photo-studio.module.css";

type StudioStatus = { ready: boolean; sandbox: boolean; dailyStoreLimit: number; paid: boolean; allowed: boolean; plan: string; trialLimit: number; trialRemaining: number };
type Props = { preview?: boolean; previewConnected?: boolean; previewResults?: string[]; compact?: boolean; onUse?: (file: File) => void; onClose?: () => void };
const samples = [
  { id: "sugar-scrub", name: "Sugar scrub", file: "/images/home/live/products-wind-me-down-sugar-scrub.webp" },
  { id: "graphic-tee", name: "Graphic tee", file: "/images/home/live/products-be-original-barcode-graphic-tee.webp" },
  { id: "custom-tumbler", name: "Custom tumbler", file: "/images/home/live/products-custom-tumbler.webp" },
];

export default function PhotoStudio({ preview = false, previewConnected = false, previewResults = [], compact = false, onUse, onClose }: Props) {
  const [status, setStatus] = useState<StudioStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [sandbox, setSandbox] = useState(false);
  const [shadow, setShadow] = useState(true);
  const [adjustments, setAdjustments] = useState<PhotoAdjustments>(DEFAULT_ADJUSTMENTS);
  const [polished, setPolished] = useState<{ source: File; settings: PhotoAdjustments; file: File } | null>(null);
  const [adjustmentError, setAdjustmentError] = useState("");
  const [guides, setGuides] = useState(false);
  const [tool, setTool] = useState<"light" | "warmth" | "angle" | "crop">("light");
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [used, setUsed] = useState(false);
  const [view, setView] = useState<"original" | "result">("original");
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const selection = useRef(0);

  useEffect(() => {
    if (preview) return;
    const abort = new AbortController();
    fetch("/api/vendor/photo-studio", { cache: "no-store", signal: abort.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Photo Studio is unavailable.");
      setStatus(data);
    }).catch(e => { if (e.name !== "AbortError") setStatusError(e.message); });
    return () => abort.abort();
  }, [preview]);
  useEffect(() => {
    if (!file) { setOriginalUrl(""); return; }
    const url = URL.createObjectURL(file); setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const finished = polished?.source === result && polished.settings === adjustments ? polished.file : null;
  const adjusting = !!result && !finished && !adjustmentError;
  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      renderAdjustments(result, adjustments).then(file => {
        if (!cancelled) { setPolished({ source: result, settings: adjustments, file }); setAdjustmentError(""); }
      }).catch(e => { if (!cancelled) setAdjustmentError(e instanceof Error ? e.message : "Please reset the adjustments and try again."); });
    }, 80);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [result, adjustments]);
  useEffect(() => {
    const displayed = polished?.source === result ? polished.file : result;
    if (!displayed) { setResultUrl(""); return; }
    const url = URL.createObjectURL(displayed); setResultUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result, polished]);
  useEffect(() => () => controller.current?.abort(), []);

  function select(next: File | undefined) {
    if (!next || lock.current) return;
    selection.current++;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type) || !next.size || next.size > 20 * 1024 * 1024) {
      setError("Choose one JPG, PNG or WebP photo, up to 20 MB."); return;
    }
    setFile(next); setResult(null); setPolished(null); setAdjustmentError(""); setAdjustments(DEFAULT_ADJUSTMENTS); setGuides(false); setReviewed(false); setUsed(false); setView("original");
  }

  function tune(next: PhotoAdjustments) {
    setAdjustments(next); setAdjustmentError(""); setReviewed(false); setUsed(false); setView("result");
  }

  async function refreshAllowance() {
    try { const response = await fetch("/api/vendor/photo-studio", { cache: "no-store" }); if (response.ok) setStatus(await response.json()); }
    catch { /* POST always enforces the current allowance on the server. */ }
  }

  async function enhance() {
    if (!file || lock.current || !status?.ready || !status.allowed || preview) return;
    lock.current = true; setBusy(true); setError(""); setResult(null); setReviewed(false); setUsed(false);
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 110_000);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 2.8, maxWidthOrHeight: 2000, initialQuality: 0.94, useWebWorker: true, signal: abort.signal });
      if (compressed.size > 3 * 1024 * 1024) throw new Error("This photo is still too large. Please choose a smaller image.");
      // Lighting is now a reversible local adjustment after background removal.
      const body = new FormData(); body.set("image", compressed, file.name); body.set("lighting", "false"); body.set("shadow", String(shadow));
      const response = await fetch("/api/vendor/photo-studio", { method: "POST", body, signal: abort.signal });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "This photo couldn't be finished. Please try again later."); }
      if (!response.headers.get("Content-Type")?.startsWith("image/")) throw new Error("The studio returned an unexpected result. Please try again later.");
      setSandbox(response.headers.get("X-Photo-Studio-Sandbox") !== "false");
      const blob = await response.blob();
      setResult(new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-linkwe.jpg`, { type: "image/jpeg" }));
      setView("result");
    } catch (e) {
      setError(e instanceof Error && e.name === "AbortError" ? "The photo took too long. Your original is safe; please try again later." : e instanceof Error ? e.message : "Please try again later.");
    } finally { clearTimeout(timeout); lock.current = false; setBusy(false); void refreshAllowance(); }
  }

  function accept() {
    if (!finished || !reviewed || sandbox || adjustmentError) return;
    if (onUse) onUse(finished);
    else { const url = URL.createObjectURL(finished); const a = document.createElement("a"); a.href = url; a.download = finished.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    setUsed(true);
  }

  async function sample(item: typeof samples[number]) {
    const version = ++selection.current;
    try {
      const response = await fetch(item.file); if (!response.ok) throw new Error();
      const original = new File([await response.blob()], `${item.name}.webp`, { type: "image/webp" });
      if (version !== selection.current) return;
      select(original);
      const selectedVersion = selection.current;
      if (previewResults.includes(item.id)) {
        const finished = await fetch(`/preview/photo-studio/results/${item.id}`, { cache: "no-store" });
        if (!finished.ok) throw new Error();
        const image = new File([await finished.blob()], `${item.id}-sandbox.jpg`, { type: "image/jpeg" });
        if (selectedVersion !== selection.current) return;
        setShadow(true);
        setResult(image); setSandbox(true); setView("result");
      }
    } catch { setError("This sample is unavailable. Try uploading your own photo."); }
  }

  const connectionMessage = preview ? previewConnected
    ? "Connected in free test mode · Choose a sample below to compare an actual result. Test photos include a Photoroom watermark."
    : "Local preview · Photo processing will be available when LinkWe’s Photoroom connection is activated."
    : statusError || (status && !status.ready ? "Photo Studio is being connected. You can still upload your original photos as usual." : "");

  return <section className={`${s.studio} ${compact ? s.compact : ""}`} aria-label="Product Photo Studio">
    <header className={s.header}>
      <div><p className={s.eyebrow}><Sparkles size={15} /> LINKWE PHOTO STUDIO</p><h1>Your product.<br /><span>In its best light.</span></h1><p className={s.intro}>A clean backdrop. A softer shadow. A photo ready for your store.</p></div>
      {onClose ? <button type="button" className={s.close} onClick={onClose} disabled={busy} aria-label="Close Photo Studio"><X /></button> : <span className={s.heroIcon} aria-hidden><ImagePlus /></span>}
    </header>
    <ol className={s.steps} aria-label="Photo preparation steps">
      <li className={!file ? s.current : ""}><span>{file ? <Check size={14} /> : "01"}</span> Add your photo</li>
      <li className={file && !result ? s.current : ""}><span>{result ? <Check size={14} /> : "02"}</span> Give it a polish</li>
      <li className={result ? s.current : ""}><span>03</span> Review & use</li>
    </ol>
    {connectionMessage && <p className={s.notice} role="status">{connectionMessage}</p>}
    {preview && previewConnected && <p className={s.small} style={{ marginBottom: 18 }}>Want to try your own product? <Link href="/dashboard/vendor/photo-studio" style={{ color: "#b74210", textDecoration: "underline" }}>Open Photo Studio in your vendor account.</Link></p>}
    {status?.sandbox && <p className={s.notice}>Test mode · Results have a Photoroom watermark and cannot be added to listings.</p>}
    {status && <div className={`${s.planNotice} ${!status.allowed ? s.planLocked : ""}`}>
      <div><strong>{status.paid ? `Included with ${status.plan === "PRO" ? "Pro" : "Growth"}` : status.allowed ? `${status.trialRemaining} free ${status.trialRemaining === 1 ? "image" : "images"} left` : "Your free image has been used"}</strong><p>{status.paid ? "Create your marketplace photos, then fine-tune as much as you like." : status.allowed ? "Try Photo Studio on one image. Zoom, crop and finishing adjustments do not use extra edits." : "Continue with an active Growth or Pro plan. Your original photos can still be uploaded as usual."}</p></div>
      {!status.paid && <Link href="/dashboard/vendor/finance">{status.allowed ? "Explore plans" : "Upgrade to keep editing"}<ArrowRight size={16} /></Link>}
    </div>}
    <div className={s.workspace}>
      <div className={`${s.stage} ${result ? s.editingStage : ""}`}>
        <div className={s.stageBar}><span>{result ? "Your photo, polished" : "Start with the real thing"}</span><span className={s.badge}>PRODUCT PHOTOGRAPHY</span></div>
        {file ? <>
          <div className={s.toggle} role="group" aria-label="Compare photos">
            <button type="button" aria-pressed={view === "original"} onClick={() => setView("original")}>Original</button>
            <button type="button" aria-pressed={view === "result"} disabled={!result} onClick={() => setView("result")}>Studio result</button>
          </div>
          <div className={s.imageStage} aria-busy={busy || adjusting}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={view === "result" && resultUrl ? resultUrl : originalUrl || undefined} alt={view === "result" ? "Enhanced product photo for review" : "Original product photo"} />
            {result && view === "result" && guides && <div className={s.alignmentGrid} aria-hidden="true" />}
            <button type="button" className={s.zoomButton} aria-label="Zoom into product photo" disabled={busy || adjusting} onClick={() => setZoomPhoto(view === "result" ? resultUrl : originalUrl)}><ZoomIn size={17} /> Zoom</button>
            {adjusting && view === "result" && <span className={s.adjusting} role="status"><LoaderCircle size={13} className={s.spin} /> Updating preview</span>}
            {busy && <div className={s.processing} role="status"><LoaderCircle className={s.spin} /><strong>Finding your product’s best light…</strong><span>This can take about a minute.</span></div>}
            {!busy && view === "result" && sandbox && <span className={s.testBadge}>TEST RESULT</span>}
          </div>
          {result && <div className={s.fineTune}>
            <div className={s.tuneHeading}><div><SlidersHorizontal size={17} /><strong>The finishing touches</strong></div><button type="button" onClick={() => { tune({ light: 0, warmth: 0, angle: 0 }); setGuides(false); }}>Reset</button></div>
            <p>Fine-tune your result. No extra processing credits.</p>
            <div className={s.toolTabs} role="group" aria-label="Finishing tools">{[{ key: "light", label: "Lighting" }, { key: "warmth", label: "Colour" }, { key: "angle", label: "Straighten" }, { key: "crop", label: "Crop" }].map(item => <button type="button" key={item.key} aria-pressed={tool === item.key} onClick={() => { setTool(item.key as typeof tool); setGuides(item.key === "angle" || item.key === "crop"); setView("result"); }}>{item.label}</button>)}</div>
            {tool === "light" && <><div className={s.presets} role="group" aria-label="Lighting presets">
              {[{ label: "Natural", value: 0 }, { label: "Balanced", value: 40 }, { label: "Brighter", value: 75 }].map(preset => <button type="button" key={preset.label} aria-pressed={adjustments.light === preset.value} onClick={() => tune({ ...adjustments, light: preset.value })}><Sun size={14} />{preset.label}</button>)}
            </div>
            <label className={s.slider}><span><strong>Lighting</strong><output>{adjustments.light}%</output></span><input type="range" aria-label="Lighting strength" min="0" max="100" step="5" value={adjustments.light} onChange={e => tune({ ...adjustments, light: Number(e.target.value) })} /><small><span>Natural</span><span>Lift darker areas</span></small></label></>}
            {tool === "warmth" && <><label className={s.slider}><span><strong>Warmth</strong><output>{adjustments.warmth > 0 ? "+" : ""}{adjustments.warmth}</output></span><input type="range" aria-label="Colour warmth" min="-30" max="30" step="1" value={adjustments.warmth} onChange={e => tune({ ...adjustments, warmth: Number(e.target.value) })} /><small><span>Cooler</span><span>Warmer</span></small></label><p className={s.tuneHint}>A little warmer can reduce a blue cast. Match the colour of your real product.</p></>}
            {tool === "angle" && <div className={s.straighten}>
              <label className={s.slider}><span><strong>Straighten</strong><output>{adjustments.angle > 0 ? "+" : ""}{adjustments.angle.toFixed(1)}°</output></span><input type="range" aria-label="Straighten angle" min="-20" max="20" step="0.5" value={adjustments.angle} onChange={e => { tune({ ...adjustments, angle: Number(e.target.value) }); setGuides(true); }} /><small><span>Tilt left</span><span>Tilt right</span></small></label>
              <div className={s.angleTools}><button type="button" aria-label="Rotate half a degree left" disabled={adjustments.angle <= -20} onClick={() => { tune({ ...adjustments, angle: Math.max(-20, adjustments.angle - 0.5) }); setGuides(true); }}>− 0.5°</button><button type="button" aria-pressed={guides} onClick={() => { setGuides(!guides); setView("result"); }}><Grid3X3 size={14} /> Guides</button><button type="button" aria-label="Rotate half a degree right" disabled={adjustments.angle >= 20} onClick={() => { tune({ ...adjustments, angle: Math.min(20, adjustments.angle + 0.5) }); setGuides(true); }}>+ 0.5°</button></div>
              <p className={s.tuneHint}>Line up a straight edge with the guides. This corrects tilt, keeping the original camera angle.</p>
            </div>}
            {tool === "crop" && <div className={s.cropTools}>
              <label className={s.slider}><span><strong>Square crop</strong><output>{(adjustments.crop?.zoom || 1).toFixed(1)}×</output></span><input type="range" aria-label="Crop size" min="1" max="3" step="0.1" value={adjustments.crop?.zoom || 1} onChange={e => tune({ ...adjustments, crop: { ...(adjustments.crop || FULL_CROP), zoom: Number(e.target.value) } })} /><small><span>Full photo</span><span>Tighter crop</span></small></label>
              <div className={s.cropPosition}>{([{ key: "x", label: "Move crop horizontally", start: "Left", end: "Right" }, { key: "y", label: "Move crop vertically", start: "Top", end: "Bottom" }] as const).map(axis => <label className={s.slider} key={axis.key}><span><strong>{axis.key === "x" ? "Horizontal position" : "Vertical position"}</strong></span><input type="range" aria-label={axis.label} min="0" max="100" step="1" disabled={!adjustments.crop || adjustments.crop.zoom === 1} value={adjustments.crop?.[axis.key] ?? 50} onChange={e => tune({ ...adjustments, crop: { ...(adjustments.crop || FULL_CROP), [axis.key]: Number(e.target.value) } })} /><small><span>{axis.start}</span><span>{axis.end}</span></small></label>)}</div>
              <button type="button" className={s.restoreCrop} onClick={() => tune({ ...adjustments, crop: FULL_CROP })}><RotateCcw size={14} /> Restore full photo</button><p className={s.tuneHint}>The preview is your saved crop. Keep the full product and its label inside the frame.</p>
            </div>}
            {adjustmentError && <p role="alert" className={s.error}>{adjustmentError}</p>}
          </div>}
          <div className={s.fileBar}><span title={file.name}>{file.name}</span><button type="button" disabled={busy} onClick={() => input.current?.click()}><RotateCcw size={15} /> Change photo</button></div>
        </> : <button type="button" className={`${s.dropzone} ${dragging ? s.dragging : ""}`} onClick={() => input.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length > 1) setError("Add one product photo at a time."); else select(e.dataTransfer.files[0]); }}>
          <span className={s.uploadIcon}><Upload size={30} /></span><strong>Drop your product photo here</strong><span>or choose a photo from your device</span><span className={s.choose}>Choose a photo <ArrowRight size={17} /></span><small>JPG, PNG or WebP · Up to 20 MB</small>
        </button>}
        <input ref={input} className={s.hiddenInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload product photo" onChange={e => { select(e.target.files?.[0]); e.target.value = ""; }} />
        {preview && <div className={s.samples}><span>{previewResults.length ? "Compare real sandbox results" : "Try a real LinkWe product"}</span><div>{samples.map(item => <button type="button" key={item.file} onClick={() => sample(item)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.file} alt="" /><span>{item.name}</span></button>)}</div></div>}
      </div>
      <aside className={s.settings}>
        <p className={s.eyebrow}>THE MARKETPLACE LOOK</p><h2>Small touches.<br /> A big difference.</h2>
        <div className={s.feature}><span className={s.swatch} /><div><strong>Fresh white background</strong><p>Let your product take the spotlight.</p></div><Check size={18} /></div>
        <div className={s.feature}><ImagePlus size={22} /><div><strong>Clean, square framing</strong><p>Centred, with room to breathe.</p></div><Check size={18} /></div>
        <div className={s.feature}><Sun size={22} /><div><strong>Better light. Your finishing touch.</strong><p>A balanced lift, with lighting, warmth and straightening controls after processing.</p></div><Check size={18} /></div>
        <label className={s.option}><span className={s.shadowIcon} /><span><strong>Soft shadow</strong><small>A natural sense of depth.</small></span><input type="checkbox" checked={shadow} disabled={busy || !!result} onChange={e => setShadow(e.target.checked)} /></label>
        {error && <p role="alert" className={s.error}>{error}</p>}
        {result ? <>
          <div className={s.review}><CheckCheck size={22} /><strong>Give it a closer look</strong><p>Check the label, colours, edges and small details against your original.</p></div>
          {!sandbox && <label className={s.confirm}><input type="checkbox" checked={reviewed} disabled={!finished || !!adjustmentError} onChange={e => setReviewed(e.target.checked)} /> <span>The product and its details look accurate.</span></label>}
          <button type="button" className={s.primary} disabled={!reviewed || sandbox || !finished || !!adjustmentError} onClick={accept}>{onUse ? "Use this photo" : "Download this photo"}{onUse ? <ArrowRight size={18} /> : <ArrowDownToLine size={18} />}</button>
          {sandbox && <p className={s.small}>This is a watermarked test. Live photo editing must be activated before results can be used.</p>}
          {used && <p role="status" className={s.success}>{onUse ? "Photo added. Save your product to keep the change." : "Photo downloaded. It’s ready to upload to your product."}</p>}
        </> : <button type="button" className={s.primary} disabled={!file || busy || !status?.ready || !status.allowed || preview} onClick={enhance}>{busy ? "Polishing your photo…" : status && !status.allowed ? "Upgrade to keep editing" : "Make it marketplace ready"}{busy ? <LoaderCircle size={18} className={s.spin} /> : <Sparkles size={18} />}</button>}
        {!preview && !status && !statusError && <p className={s.small} role="status">Checking studio availability…</p>}
        {!result && status?.ready && <p className={s.small}>Up to {status.dailyStoreLimit} attempts per store each day. Photos are processed securely by Photoroom.</p>}
        <div className={s.promise}><ShieldCheck size={23} /><p><strong>Your product stays yours.</strong>We keep your original. No new camera angle or invented product details. Always review before using.</p></div>
      </aside>
    </div>
    <footer className={s.tips}><strong>A better starting photo makes all the difference.</strong><p>Use an unobstructed product, a clear label and even light. Hands or objects covering the product may stay in the finished image.</p></footer>
    {zoomPhoto && <PhotoZoom src={zoomPhoto} onClose={() => setZoomPhoto(null)} />}
  </section>;
}
