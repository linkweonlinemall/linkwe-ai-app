"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { dominantLogoColour, logoTextColour, type LogoColour } from "@/lib/storefront/logo-colour";
import styles from "./storefront.module.css";

export default function StoreHeroShell({ coverPhotoUrl, logoUrl, className, children }: {
  coverPhotoUrl: string | null;
  logoUrl: string | null;
  className: string;
  children: ReactNode;
}) {
  const [extracted, setExtracted] = useState<{ source: string; colour: LogoColour | null } | null>(null);

  useEffect(() => {
    if (!logoUrl) return;
    let active = true;
    const logo = new window.Image();
    logo.crossOrigin = "anonymous";
    logo.decoding = "async";
    logo.onload = () => {
      if (!active) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 64;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        context.drawImage(logo, 0, 0, 64, 64);
        const colour = dominantLogoColour(context.getImageData(0, 0, 64, 64).data);
        setExtracted({ source: logoUrl, colour });
      } catch {
        // Some external image hosts prevent canvas reads; retain the cover's natural colours.
      }
    };
    logo.onerror = () => { /* Missing logos keep the neutral cover treatment. */ };
    logo.src = logoUrl;
    return () => { active = false; logo.onload = null; logo.onerror = null; };
  }, [logoUrl]);

  const colour = extracted?.source === logoUrl ? extracted.colour : null;
  const brandStyle = {
    "--store-brand-rgb": (colour ?? [61, 105, 93]).join(" "),
    "--store-brand-ink": logoTextColour(colour).join(" "),
  } as CSSProperties;

  return <section className={`${styles.hero} ${className}`} style={brandStyle} aria-labelledby="store-title">
    <div className={styles.heroBackdrop} aria-hidden>
      {coverPhotoUrl && <div className={styles.heroBackdropPhoto} style={{ backgroundImage: `url(${JSON.stringify(coverPhotoUrl)})` }} />}
      <div className={styles.heroBrandWash} style={{ opacity: colour ? 1 : 0 }} />
    </div>
    {children}
  </section>;
}
