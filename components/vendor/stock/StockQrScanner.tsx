"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Search, X } from "lucide-react";
import { resolveVendorStockQr } from "@/app/actions/vendor-stock";
import { createStockCameraSession } from "@/lib/vendor/stock/camera";
import { parseStockQr } from "@/lib/vendor/stock/scan";
import type { StockProduct } from "@/lib/vendor/stock/model";
import { STOCK_UPGRADE_HREF } from "@/lib/vendor/stock/access";
import s from "./stock-workspace.module.css";

type Props = { storeId: string; onProduct: (product: StockProduct) => void; onClose: () => void };

export default function StockQrScanner({ storeId, onProduct, onClose }: Props) {
  const id = `stock-camera-${useId().replace(/[^a-z0-9]/gi, "")}`;
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const active = useRef(false);
  const inFlight = useRef(false);
  const lifecycle = useRef<Promise<void>>(Promise.resolve());
  const processRef = useRef<(value: string) => Promise<void>>(async () => {});
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    active.current = true;
    heading.current?.focus();
    return () => { active.current = false; };
  }, []);

  useEffect(() => {
    processRef.current = async value => {
      if (inFlight.current || !active.current) return;
      inFlight.current = true;
      setBusy(true); setError(""); setCameraOn(false);
      try {
        parseStockQr(value);
        if (!navigator.onLine) throw new Error("Connect to the internet to check this product and confirm stock updates. You can search the loaded catalog below.");
        const result = await resolveVendorStockQr(value, storeId);
        if (!active.current) return;
        if (!result.ok) { setError(result.error); setUpgradeRequired(!!result.upgradeRequired); return; }
        onProduct(result.product);
      } catch (cause) {
        if (active.current) setError(cause instanceof Error && cause.name !== "TypeError" ? cause.message : "Could not check this label. Reconnect and try again, or search below.");
      } finally {
        inFlight.current = false;
        if (active.current) setBusy(false);
      }
    };
  }, [storeId, onProduct]);

  useEffect(() => {
    if (!cameraOn) return;
    const previous = lifecycle.current;
    const session = createStockCameraSession(async () => {
      await previous;
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(id, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      return {
        start: async onDecode => {
          await scanner.start({ facingMode: "environment" }, { fps: 8, qrbox: (width, height) => {
            const size = Math.min(250, Math.floor(Math.min(width, height) * .75));
            return { width: size, height: size };
          } }, onDecode, () => {});
        },
        stop: async () => { if (scanner.isScanning) await scanner.stop(); },
        clear: () => scanner.clear(),
      };
    }, value => { void processRef.current(value); }, () => setCameraReady(true), () => {
      setError("Camera unavailable. Allow access when your browser asks, close other camera apps, or paste the product link / search below.");
      setCameraOn(false);
    });
    const hide = () => { if (document.visibilityState === "hidden") { void session.stop(); setCameraOn(false); } };
    document.addEventListener("visibilitychange", hide);
    return () => { document.removeEventListener("visibilitychange", hide); lifecycle.current = session.stop(); };
  }, [cameraOn, id]);

  function startCamera() {
    if (inFlight.current) return;
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot open a camera here. Use HTTPS (or localhost on this device), or paste the product link / search below.");
      return;
    }
    setCameraReady(false); setCameraOn(true);
  }

  return <section className={s.scanner} aria-labelledby={`${id}-heading`}>
    <header className={s.scanHeader}><div><h3 id={`${id}-heading`} ref={heading} tabIndex={-1}>Scan a product label</h3><p>Use an existing product QR from QR Studio. Check the item, choose its exact option and add a quantity.</p></div><button type="button" className={s.secondary} onClick={onClose} aria-label="Close QR scanner"><X size={17} /></button></header>
    <p className={s.helper}>Camera access starts only when you tap Start camera and allow your browser’s request. One label is captured at a time; scanning never reduces stock.</p>
    <div id={id} className={s.cameraPreview} hidden={!cameraOn} />
    {cameraOn && <p role="status" className={s.helper}>{cameraReady ? "Point the camera at the product QR. It stops after one capture." : "Starting camera…"}</p>}
    <div className={s.scanActions}>{cameraOn
      ? <button type="button" className={s.secondary} onClick={() => setCameraOn(false)}><X size={16} /> Stop camera</button>
      : <button type="button" className={s.primary} disabled={busy} onClick={startCamera}><Camera size={17} /> Start camera</button>}
      <button type="button" className={s.secondary} onClick={onClose}><Search size={16} /> Search instead</button>
    </div>
    <form className={s.scanManual} onSubmit={event => { event.preventDefault(); void processRef.current(manual); }}>
      <label htmlFor={`${id}-link`}>Or paste the product QR link</label>
      <div><input id={`${id}-link`} type="text" inputMode="url" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={2048}
        placeholder="https://www.linkweonlinemall.com/products/…" value={manual} disabled={busy} onChange={event => setManual(event.target.value)} />
        <button type="submit" className={s.secondary} disabled={busy || !manual.trim()}>{busy ? "Checking…" : "Find product"}</button></div>
    </form>
    {busy && <p role="status" className={s.helper}>Checking this label in your stock catalog…</p>}
    {error && <p className={s.error} role="alert">{error}</p>}
    {upgradeRequired && <Link href={STOCK_UPGRADE_HREF} className={s.secondary}>View Pro in Finance</Link>}
  </section>;
}
