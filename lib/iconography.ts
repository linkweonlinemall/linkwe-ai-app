/**
 * Standard Lucide sizing & colour for platform UI.
 * Compose with any Lucide icon: `<Icon className={icn.inline} strokeWidth={2} />`.
 */
export const icn = {
  /** Inline with body text — 16px */
  inline: "size-4 shrink-0 text-gray-600 stroke-[2]",
  /** Inside buttons — 18px */
  button: "size-[18px] shrink-0 text-gray-600 stroke-[2]",
  /** Standalone UI chrome — 20px */
  ui: "size-5 shrink-0 text-gray-600 stroke-[2]",
  /** Section headers / promo rows — 24px */
  header: "size-6 shrink-0 text-gray-600 stroke-[2]",
  /** Empty states — 64px */
  empty: "size-16 shrink-0 text-gray-600 stroke-[1.25]",
  /** On dark surfaces */
  onDark: "size-4 shrink-0 text-gray-300 stroke-[2]",
  onDarkUi: "size-5 shrink-0 text-gray-300 stroke-[2]",
  onDarkHeader: "size-6 shrink-0 text-gray-300 stroke-[2]",
  onDarkEmpty: "size-16 shrink-0 text-gray-300 stroke-[1.25]",
  /** Semantic */
  primary: "size-4 shrink-0 text-[#D4450A] stroke-[2]",
  primaryUi: "size-5 shrink-0 text-[#D4450A] stroke-[2]",
  success: "size-4 shrink-0 text-green-600 stroke-[2]",
  danger: "size-4 shrink-0 text-red-600 stroke-[2]",
} as const;
