import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import type { Values } from "./model";

export type ParsedSheet = { name: string; headers: string[]; rows: Values[] };
function table(name: string, rows: unknown[][]): ParsedSheet {
  const nonempty = rows.filter(row => row.some(v => v != null && String(v).trim()));
  if (nonempty.length < 2) throw new Error("Include column headings and at least one data row.");
  const headers = nonempty[0].map((v, i) => String(v ?? "").trim() || `Column ${i + 1}`);
  if (headers.length > 120 || new Set(headers).size !== headers.length || headers.some(h => ["__proto__", "constructor", "prototype"].includes(h))) throw new Error("Use up to 120 uniquely named columns.");
  if (nonempty.length > 501) throw new Error("Split this sheet into files of up to 500 rows.");
  return { name, headers, rows: nonempty.slice(1).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]))) };
}
export async function parseImportFile(file: File): Promise<ParsedSheet[]> {
  if (!file.size || file.size > 4 * 1024 * 1024) throw new Error("Choose a CSV, TSV or Excel (.xlsx) file up to 4 MB.");
  const extension = file.name.toLowerCase().split(".").pop();
  if (extension === "csv" || extension === "tsv") {
    const rows = parse(await file.text(), { bom: true, delimiter: extension === "tsv" ? "\t" : ",", skip_empty_lines: true, relax_column_count: true, max_record_size: 150000 });
    return [table("Sheet 1", rows)];
  }
  if (extension !== "xlsx") throw new Error("Use CSV, TSV or .xlsx. Save older .xls files as .xlsx first.");
  // Inspect ZIP entry sizes before decompression (a small workbook can expand enormously).
  const bytes = Buffer.from(await file.arrayBuffer());
  let expanded = 0, entries = 0;
  for (let i = 0; i + 46 <= bytes.length; i++) if (bytes.readUInt32LE(i) === 0x02014b50) {
    expanded += bytes.readUInt32LE(i + 24); entries++;
    if (expanded > 32 * 1024 * 1024 || entries > 2000) throw new Error("This workbook is too large when expanded. Export the needed sheet as CSV.");
    i += 45 + bytes.readUInt16LE(i + 28) + bytes.readUInt16LE(i + 30) + bytes.readUInt16LE(i + 32);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  if (workbook.worksheets.length > 20) throw new Error("Use a workbook with no more than 20 sheets.");
  const sheets: ParsedSheet[] = [];
  for (const sheet of workbook.worksheets) {
    if (!sheet.actualRowCount) continue;
    if (sheet.rowCount > 501 || sheet.columnCount > 120) throw new Error(`“${sheet.name}” exceeds 500 data rows or 120 columns. Export only the needed range.`);
    const rows: unknown[][] = [];
    sheet.eachRow(row => {
      const values: unknown[] = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        const value = cell.value;
        if (value && typeof value === "object" && ("formula" in value || "sharedFormula" in value)) throw new Error(`“${sheet.name}”, ${cell.address}: paste formula results as values before importing.`);
        values[col - 1] = value instanceof Date ? value.toISOString().replace(/Z$/, "-04:00") : value && typeof value === "object" && "richText" in value ? value.richText.map(v => v.text).join("") : value && typeof value === "object" && "text" in value ? value.text : value ?? "";
      });
      rows.push(values);
    });
    if (rows.length > 1) sheets.push(table(sheet.name, rows));
  }
  if (!sheets.length) throw new Error("No sheet contains column headings and data rows.");
  if (sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0) > 2000) throw new Error("Use a workbook with no more than 2,000 total rows.");
  return sheets;
}
