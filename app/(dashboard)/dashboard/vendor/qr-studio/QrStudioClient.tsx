"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { ArrowDownToLine, ArrowUpRight, Check, Copy, Link2, Printer, QrCode, ScanLine, Sparkles } from "lucide-react";
import { escapeQrText, publicQrUrl, qrFilename } from "@/lib/vendor/qr-studio";
import s from "./qr-studio.module.css";

type Destination = { label: string; value: string; group: string };
const colours = [{ label: "Forest", value: "#193E37" }, { label: "Ink", value: "#181818" }, { label: "Terracotta", value: "#923810" }];

export default function QrStudioClient({ destinations, storeName }: { destinations: Destination[]; storeName: string }) {
  const [url, setUrl] = useState(destinations[0]?.value ?? "");
  const [title, setTitle] = useState(storeName);
  const [caption, setCaption] = useState("Scan to explore our store");
  const [colour, setColour] = useState(colours[0].value);
  const [result, setResult] = useState<{ url: string; colour: string; png: string; svg: string } | null>(null);
  const [generationError, setGenerationError] = useState("");
  const [message, setMessage] = useState("");
  const validation = useMemo(() => { try { return { url: publicQrUrl(url), error: "" }; } catch (error) { return { url: "", error: error instanceof Error ? error.message : "Check your link." }; } }, [url]);
  const selected = destinations.find(item => item.value === url);
  const groups = [...new Set(destinations.map(item => item.group))];
  const ready = result?.url === validation.url && result?.colour === colour ? result : null;

  useEffect(() => {
    if (!validation.url) return;
    let cancelled = false;
    const options = { width: 1200, margin: 4, errorCorrectionLevel: "H" as const, color: { dark: colour, light: "#FFFFFF" } };
    Promise.all([QRCode.toDataURL(validation.url, options), QRCode.toString(validation.url, { ...options, type: "svg" })])
      .then(([png, svg]) => { if (!cancelled) { setResult({ url: validation.url, colour, png, svg }); setGenerationError(""); } })
      .catch(() => { if (!cancelled) { setResult(null); setGenerationError("We couldn't create this code. Try a shorter LinkWe link."); } });
    return () => { cancelled = true; };
  }, [validation.url, colour]);

  async function copyLink() {
    if (!ready) return;
    try { await navigator.clipboard.writeText(ready.url); setMessage("Link copied. You're ready to share."); }
    catch { setMessage("Copying is unavailable here. Select and copy the link in the destination field."); }
  }

  function printCard() {
    if (!ready) return;
    const frame = document.createElement("iframe");
    frame.title = "Printable QR card";
    frame.style.cssText = "position:fixed;width:1px;height:1px;left:-9999px;border:0";
    frame.onload = () => {
      const printWindow = frame.contentWindow;
      if (!printWindow) { frame.remove(); setMessage("Printing is unavailable. Download the SVG for your printer."); return; }
      printWindow.addEventListener("afterprint", () => frame.remove(), { once: true });
      printWindow.focus(); printWindow.print();
      window.setTimeout(() => frame.remove(), 120000);
    };
    frame.srcdoc = `<!doctype html><html><head><title>${escapeQrText(title || storeName)} · LinkWe QR</title><style>@page{size:A4;margin:20mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:${colour};margin:0;display:grid;place-items:center}.card{width:120mm;max-width:100%;border:1px solid #dae0d6;border-radius:18px;padding:14mm;text-align:center;margin:12mm auto}.brand{font-size:10px;letter-spacing:3px;color:#7c886f}h1{font-size:27px;overflow-wrap:anywhere}svg{width:76mm;max-width:100%;height:auto}p{font-size:16px;line-height:1.5;overflow-wrap:anywhere}.url{font-size:10px;color:#6d7866;overflow-wrap:anywhere}</style></head><body><div class="card"><div class="brand">FIND US ON LINKWE</div><h1>${escapeQrText(title || storeName)}</h1>${ready.svg}<p>${escapeQrText(caption)}</p><div class="url">${escapeQrText(ready.url)}</div></div></body></html>`;
    document.body.appendChild(frame);
  }

  return <>
    <div className={s.workspace}>
      <div className={s.controls}>
        <section className={s.panel} data-tour="qr-destination">
          <div className={s.sectionTitle}><span>01</span><div><h2>Choose a destination</h2><p>Where should your customers land?</p></div><Link2 size={21}/></div>
          <label className={s.field}><span>Your published content</span><select value={selected ? url : "custom"} onChange={event => { if (event.target.value === "custom") return; const item = destinations.find(entry => entry.value === event.target.value); setUrl(event.target.value); setMessage(""); if (item) { setTitle(item.label); setCaption(item.group === "Services" ? "Scan to explore this service" : item.group === "Events" ? "Scan for event details & tickets" : item.group === "Products" ? "Scan to shop this product" : "Scan to explore our store"); } }}><option value="custom" disabled>Custom LinkWe link</option>{groups.map(group => <optgroup key={group} label={group}>{destinations.filter(item => item.group === group).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</optgroup>)}</select></label>
          <label className={s.field}><span>Or paste a public LinkWe link</span><input type="url" value={url} onChange={event => { setUrl(event.target.value); setMessage(""); }} placeholder="https://www.linkweonlinemall.com/store/..." aria-describedby="qr-link-help" aria-invalid={Boolean(validation.error)}/></label>
          <p id="qr-link-help" className={validation.error ? s.error : s.hint}>{validation.error || "Published listings appear here automatically. Check the public page before sharing."}</p>
        </section>
        <section className={s.panel} data-tour="qr-design">
          <div className={s.sectionTitle}><span>02</span><div><h2>Give it your personality</h2><p>A small card with a clear invitation.</p></div><Sparkles size={21}/></div>
          <label className={s.field}><span>Card heading & download name</span><input value={title} maxLength={80} onChange={event => setTitle(event.target.value)}/></label>
          <label className={s.field}><span>Invitation to scan</span><input value={caption} maxLength={100} onChange={event => setCaption(event.target.value)}/></label>
          <fieldset className={s.colours}><legend>Code colour</legend>{colours.map(item => <button type="button" key={item.value} onClick={() => setColour(item.value)} aria-pressed={colour === item.value}><span style={{ background: item.value }}>{colour === item.value && <Check size={14}/>}</span>{item.label}</button>)}</fieldset>
        </section>
        <aside className={s.tip}><ScanLine size={23}/><div><strong>A quick scan check goes a long way.</strong><p>Try the code with your phone before printing. Keep its white border clear and make it at least 3 cm wide.</p></div></aside>
      </div>
      <section className={s.preview} data-tour="qr-preview">
        <div className={s.previewHeading}><span>YOUR PRINTABLE CARD</span><span><span className={s.liveDot}/>Live preview</span></div>
        <div className={s.card} style={{ color: colour }}>
          <span className={s.cardBrand}>FIND US ON LINKWE</span><h2>{title || storeName}</h2>
          <div className={s.code}>{ready ? <img src={ready.png} width={280} height={280} alt={`QR code linking to ${ready.url}`}/> : <div className={s.placeholder}><QrCode size={65}/><span>{validation.error ? "Choose a valid link" : generationError || "Preparing your code…"}</span></div>}</div>
          <p>{caption}</p><small>{validation.url.replace("https://", "")}</small>
        </div>
        <div className={s.exports}>
          {ready ? <><a className={s.primary} href={ready.png} download={`${qrFilename(title)}.png`}><ArrowDownToLine size={17}/>Download PNG<span>1200 px</span></a><a href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(ready.svg)}`} download={`${qrFilename(title)}.svg`}><ArrowDownToLine size={16}/>SVG for print</a></> : <button className={s.primary} disabled><ArrowDownToLine size={17}/>Download PNG</button>}
          <button type="button" disabled={!ready} onClick={printCard}><Printer size={16}/>Print card</button><button type="button" disabled={!ready} onClick={copyLink}><Copy size={16}/>Copy link</button>
        </div>
        {ready && <a className={s.openPage} href={ready.url} target="_blank" rel="noreferrer">Check the destination <ArrowUpRight size={14}/></a>}
        <p className={s.status} role="status">{generationError || message || "PNG and SVG download the code. Print card includes your heading and invitation."}</p>
      </section>
    </div>
    <footer className={s.ideas}><span>PUT IT TO WORK</span><p>On your counter. In your packaging. At your next event.<br/><strong>One scan brings your business closer.</strong></p></footer>
  </>;
}
