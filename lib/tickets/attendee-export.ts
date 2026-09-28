/** Quote every cell and neutralise spreadsheet formula prefixes, including after whitespace. */
export function attendeeCsvCell(value: unknown): string {
  let text=String(value??"").replace(/\0/g,"");
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text=`'${text}`;
  return `"${text.replace(/"/g,'""')}"`;
}
export function attendeeCsv(rows: unknown[][]): string { return "\uFEFF"+rows.map(row=>row.map(attendeeCsvCell).join(",")).join("\r\n"); }
