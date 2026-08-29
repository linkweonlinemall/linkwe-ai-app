"use client";

import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { IconCopy, IconDownload, IconPrinter, IconQrcode, IconSparkles } from "@tabler/icons-react";

type Destination = { label: string; value: string; group: string };

export default function QrStudioClient({ destinations, storeName }: { destinations: Destination[]; storeName: string }) {
  const [url, setUrl] = useState(destinations[0]?.value ?? "");
  const [title, setTitle] = useState(storeName);
  const [image, setImage] = useState("");
  const [message, setMessage] = useState("");
  const selected = useMemo(() => destinations.find((item) => item.value === url), [destinations, url]);
  const groupedDestinations = useMemo(() => destinations.reduce<Record<string, Destination[]>>((groups, item) => {
    (groups[item.group] ??= []).push(item);
    return groups;
  }, {}), [destinations]);

  async function generate() {
    setMessage("");
    try {
      const parsed = new URL(url);
      if (!/^(www\.)?linkweonlinemall\.com$/i.test(parsed.hostname)) throw new Error("Use a LinkWe page URL.");
      const data = await QRCode.toDataURL(parsed.toString(), { width: 900, margin: 3, errorCorrectionLevel: "H", color: { dark: "#1C1C1AFF", light: "#FFFFFFFF" } });
      setImage(data);
      setMessage("QR code ready to download, print or share.");
    } catch (error) {
      setImage("");
      setMessage(error instanceof Error ? error.message : "Enter a valid LinkWe URL.");
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setMessage("Link copied.");
  }

  return <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.7fr)]">
    <section className="min-w-0 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-orange-50 text-[#D4450A]"><IconSparkles className="size-5"/></span><div><h2 className="font-black text-zinc-950">Choose what the code opens</h2><p className="text-xs text-zinc-500">Only pages belonging to LinkWe can be encoded here.</p></div></div>
      <label className="mt-6 block text-[10px] font-black uppercase tracking-wider text-zinc-500">Your LinkWe content</label>
      <select value={url} onChange={(event) => { const item = destinations.find((entry) => entry.value === event.target.value); setUrl(event.target.value); if (item) setTitle(item.label); setImage(""); }} className="mt-2 min-h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-900 outline-none focus:border-[#D4450A]">
        {Object.entries(groupedDestinations).map(([group, items]) => <optgroup key={group} label={group}>{items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</optgroup>)}
      </select>
      <label className="mt-5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">Or paste a LinkWe URL</label>
      <input value={url} onChange={(event) => { setUrl(event.target.value); setImage(""); }} inputMode="url" placeholder="https://www.linkweonlinemall.com/..." className="mt-2 min-h-12 w-full rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-[#D4450A]"/>
      <label className="mt-5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">Download title</label>
      <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} className="mt-2 min-h-12 w-full rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-[#D4450A]"/>
      <button type="button" onClick={generate} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4450A] to-[#E8820C] px-5 text-sm font-black text-white shadow-lg shadow-orange-900/15"><IconQrcode className="size-5"/> Generate QR code</button>
      {message ? <p className="mt-3 text-center text-xs font-medium text-zinc-500" role="status">{message}</p> : null}
    </section>
    <section className="flex min-h-[420px] min-w-0 flex-col items-center justify-center overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top,#5A210B,#1C1C1A_58%)] p-6 text-center text-white shadow-xl">
      {image ? <><div className="rounded-[24px] bg-white p-4 shadow-2xl"><img src={image} alt={`QR code for ${title || selected?.label || "LinkWe page"}`} className="size-[min(62vw,270px)] object-contain"/></div><h3 className="mt-5 max-w-xs text-lg font-black">{title || selected?.label}</h3><p className="mt-1 max-w-xs break-all text-[10px] leading-4 text-white/50">{url}</p><div className="mt-5 grid w-full max-w-sm grid-cols-3 gap-2"><a href={image} download={`${(title || "linkwe-qr").toLowerCase().replace(/[^a-z0-9]+/g,"-")}.png`} className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-white text-[11px] font-bold text-zinc-950"><IconDownload className="size-4"/>Download</a><button type="button" onClick={copyLink} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/10 text-[11px] font-bold"><IconCopy className="size-4"/>Copy</button><button type="button" onClick={() => window.print()} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/10 text-[11px] font-bold"><IconPrinter className="size-4"/>Print</button></div></> : <><span className="flex size-24 items-center justify-center rounded-[28px] border border-white/10 bg-white/10"><IconQrcode className="size-12 text-orange-300"/></span><h3 className="mt-6 text-xl font-black">Your code will appear here</h3><p className="mt-2 max-w-xs text-sm leading-6 text-white/55">Generate a scan-ready code for your store, products, services or events.</p></>}
    </section>
  </div>;
}
