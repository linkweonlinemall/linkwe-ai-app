/**
 * LinkWe canonical design tokens (typography, color, rhythm).
 *
 * Typography: **Sora** is loaded in `app/layout.tsx` (`--font-sora`) and applied on `body`
 * plus `font-sans` via Tailwind `@theme`. Use `typography.*` helpers or `tw.fontSans` so UI stays on-brand.
 *
 * Neutral UI: Tailwind zinc scale (defaults) — not duplicated here as hex tokens.
 */

export const colors = {
  scarlet: "#D4450A",
  /** Hover / pressed scarlet — matches `:root --scarlet-hover` */
  scarletHover: "#B83A09",
  amber: "#E8820C",
  blue: "#1A7FB5",
  dark: "#1C1C1A",
  background: "#F5F5F5",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B",
} as const;

/**
 * Typography scale — compose with semantic text colours (e.g. `text-zinc-900`, `tw.textScarlet`).
 * All presets include `font-sans` so nested regions stay Sora-first.
 */
export const typography = {
  /** Hero / page titles: 32px mobile → 48px md → 56px lg */
  h1: "font-sans text-[2rem] md:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight",
  /** Section titles: 24px mobile → larger on md+ */
  h2: "font-sans text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight leading-snug",
  h3: "font-sans text-2xl font-semibold",
  h4: "font-sans text-xl font-semibold",
  body: "font-sans text-base",
  /** Use sparingly on mobile — prefer `body` for 16px minimum */
  bodySmall: "font-sans text-sm md:text-sm",
  caption: "font-sans text-xs font-semibold uppercase tracking-wide",
} as const;

/**
 * Vertical rhythm & common layout gaps — Tailwind-aligned.
 */
export const spacing = {
  /** Primary section vertical padding */
  sectionY: "py-16 md:py-24",
  cardPadding: "p-6",
  cardGap: "gap-6",
} as const;

/**
 * Border radius — cards use 8px (`rounded-lg`), controls 6px (`rounded-md`), pills/badges full round.
 */
export const radius = {
  card: "rounded-lg",
  button: "rounded-md",
  pill: "rounded-full",
  avatar: "rounded-full",
} as const;

/** Elevation presets */
export const shadow = {
  card: "shadow-sm",
  cardHover: "shadow-md",
  modal: "shadow-lg",
} as const;

/**
 * Tailwind class bundles using palette hex literals (required for Tailwind JIT).
 * Keep in sync with `colors` above.
 */
export const tw = {
  fontSans: "font-sans",

  bgPage: "bg-[#F5F5F5]",
  /** Frosted sticky strip on light pages */
  bgPageTranslucent95: "bg-[#F5F5F5]/95",
  /** Match page background for logo ring */
  ringPage: "ring-[#F5F5F5]",
  bgDark: "bg-[#1C1C1A]",
  textOnDarkMuted: "text-white/70",
  borderDarkMuted: "border-white/20",

  textPrimary: "text-[#1C1C1A]",
  textScarlet: "text-[#D4450A]",
  hoverTextScarlet: "hover:text-[#D4450A]",
  bgScarlet: "bg-[#D4450A]",
  hoverBgScarletHover: "hover:bg-[#B83A09]",
  borderScarlet: "border-[#D4450A]",
  ringScarlet: "ring-[#D4450A]",
  borderScarletMuted30: "border-[#D4450A]/30",
  bgScarletMuted5: "bg-[#D4450A]/5",
  bgScarletMuted10: "bg-[#D4450A]/10",
  hoverBgScarletMuted10: "hover:bg-[#D4450A]/10",
  fromScarletOverlay: "from-[#D4450A]/10",

  fillAmber: "fill-[#E8820C]",
  bgBlue: "bg-[#1A7FB5]",
  textBlueOnBadge: "text-white",

  textSuccessToken: "text-[#10B981]",
  bgSuccessSolid: "bg-[#10B981]",
  borderSuccessToken: "border-[#10B981]",
  bgSuccessSoft: "bg-emerald-50",
  textSuccessSoft: "text-emerald-700",

  textDangerToken: "text-[#EF4444]",
  hoverTextDanger: "hover:text-[#EF4444]",
  textWarningToken: "text-[#F59E0B]",
} as const;

/** Inline CSS gradients / backgrounds using only canonical colours + rgba derivatives of scarlet. */
export const css = {
  scarletGlowRow: `linear-gradient(90deg, rgba(212,69,10,0.08) 0%, transparent 50%, rgba(212,69,10,0.06) 100%)`,
  scarletRadialSoft: `radial-gradient(circle, rgba(212,69,10,0.55), transparent)`,
  scarletRadialMuted: `radial-gradient(circle, rgba(212,69,10,0.65), transparent)`,
  scarletRadialLight: `radial-gradient(circle, rgba(212,69,10,0.30), transparent)`,
  scarletDotsBg: `radial-gradient(circle at 22% 45%, rgba(212,69,10,0.09) 0%, transparent 55%), radial-gradient(circle at 78% 52%, rgba(212,69,10,0.06) 0%, transparent 52%)`,
  /** Hero vendor CTA — scarlet → dark using palette only */
  vendorCtaGradient: `linear-gradient(135deg, ${colors.scarlet} 0%, ${colors.dark} 100%)`,
} as const;
