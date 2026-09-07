/** Wrap a CSV cell in double quotes when needed; escape internal `"` as `""`. */
export function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  // Spreadsheet apps must treat user-controlled content as text, never a formula.
  const s = typeof value === "string" && /^[\s]*[=+@-]/.test(raw) ? `'${raw}` : raw;
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
