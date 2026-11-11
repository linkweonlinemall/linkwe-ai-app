"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import styles from "./shop.module.css";

export default function CopyFilteredLink() {
  const [status, setStatus] = useState("");
  const [fallback, setFallback] = useState("");
  async function copy() {
    const url = new URL(window.location.href);
    url.searchParams.delete("page");
    url.hash = "shop-results";
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url.toString());
      setFallback("");
      setStatus("Filtered link copied.");
    } catch {
      setFallback(url.toString());
      setStatus("Copy the link below to share these filters.");
    }
  }
  return <div className={styles.copyLink}><button type="button" onClick={copy}><Link2 size={15} aria-hidden />Copy filtered link</button><span role="status">{status}</span>{fallback && <label>Filtered shop link<input readOnly value={fallback} onFocus={event => event.currentTarget.select()} /></label>}</div>;
}
