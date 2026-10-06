export const IMPORT_KINDS = ["vendor", "product", "service", "event"] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];
export type Values = Record<string, unknown>;
export type ImportField = {
  name: string; label: string; type: string; list: boolean; required: boolean;
  options?: string[]; value?: unknown; group: string; lookup?: boolean;
};
export type ImportRowView = {
  id: string; number: number; raw: Values; values: Values; errors: Record<string, string>;
  state: string; recordId: string | null; createdRecord: boolean; version: number;
  note: string | null; createdUserId: string | null;
};
export type ImportBatchView = {
  id: string; kind: ImportKind; filename: string; sheet: string; headers: string[];
  mapping: Record<string, string>; storeId: string | null; createdAt: string;
  rows: ImportRowView[]; assets: { id: string; name: string; url: string }[];
  changes: { id: string; action: string; rowId: string | null; createdAt: string; summary: string; undone: boolean }[];
};
export const IMPORT_OPERATIONS = ["map", "check", "edit", "import", "update_existing", "publish", "draft", "archive", "delete", "undo", "invite", "refresh"] as const;
export type ImportOperation = (typeof IMPORT_OPERATIONS)[number];
export type ImportCommand = {
  operation: ImportOperation; rowIds?: string[]; patch?: Values;
  mapping?: Record<string, string>; storeId?: string | null;
  versions?: Record<string, number>; changeId?: string;
};
export type ImportResult = { rowId: string; ok: boolean; message: string };
export const REVIEW_OPERATIONS: ImportOperation[] = ["update_existing", "publish", "delete", "invite"];
export function rowTitle(kind: ImportKind, values: Values) {
  return String(values[kind === "event" ? "title" : "name"] || values.email || "Untitled draft");
}
export function guessMapping(headers: string[], fields: ImportField[]) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases: Record<string, string[]> = {
    name: ["storename", "businessname", "productname", "servicename"], title: ["eventname", "eventtitle"],
    vendorName: ["fullname", "vendorname", "ownername"], email: ["emailaddress", "vendoremail", "owneremail"],
    phone: ["phonenumber", "telephone", "contactnumber"], price: ["unitprice", "sellingprice", "cost"],
    description: ["storedescription", "productdescription", "servicedescription", "eventdescription"],
    stock: ["quantity", "inventory", "stockquantity"], slug: ["storeslug", "urlname"],
    startDate: ["startsat", "eventdate", "startdatetime"], endDate: ["endsat", "enddatetime"],
    storeId: ["storeid"], storeSlug: ["storeslug"], vendorId: ["vendorid", "ownerid"],
  };
  const used = new Set<string>();
  return Object.fromEntries(headers.map(header => {
    const match = fields.find(f => !used.has(f.name) && [norm(f.name), norm(f.label), ...(aliases[f.name] || [])].includes(norm(header)));
    if (match) used.add(match.name);
    return [header, match?.name || ""];
  }));
}
export function convertCell(value: unknown, field: ImportField): unknown {
  if (typeof value === "string" && /^'[\s]*[=+@-]/.test(value)) value = value.slice(1);
  if (value == null || value === "") return field.list ? [] : null;
  if (field.list) return Array.isArray(value) ? value : String(value).trim().startsWith("[") ? JSON.parse(String(value)) : String(value).split("|").map(s => s.trim()).filter(Boolean);
  if (field.type === "Json") return typeof value === "string" ? JSON.parse(value) : value;
  if (field.type === "Boolean") {
    if (typeof value === "boolean") return value;
    if (["true", "yes", "1"].includes(String(value).toLowerCase())) return true;
    if (["false", "no", "0"].includes(String(value).toLowerCase())) return false;
    throw new Error("Use yes/no or true/false.");
  }
  if (["Float", "Int", "Decimal"].includes(field.type)) {
    const text = String(value).trim();
    if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text)) throw new Error("Use a number with a decimal point, without a currency symbol.");
    return Number(text.replaceAll(",", ""));
  }
  if (field.type === "DateTime") {
    const text = String(value).trim();
    if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(text)) throw new Error("Use YYYY-MM-DD or YYYY-MM-DDTHH:mm. Local times use Trinidad & Tobago (UTC−04:00).");
    const local = text.length === 10 ? `${text}T00:00:00-04:00` : /(?:Z|[+-]\d{2}:\d{2})$/.test(text) ? text : `${text}-04:00`;
    const parsed = new Date(local);
    const day = new Date(`${text.slice(0, 10)}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || !Number.isFinite(+day) || day.toISOString().slice(0, 10) !== text.slice(0, 10)) throw new Error("Enter a valid date.");
    return parsed.toISOString();
  }
  if (field.options) {
    const match = field.options.find(o => o.toLowerCase() === String(value).toLowerCase());
    return match || String(value);
  }
  return String(value).trim();
}
export function mapRow(raw: Values, mapping: Record<string, string>, fields: ImportField[]) {
  const values: Values = {}, errors: Record<string, string> = {};
  for (const [header, target] of Object.entries(mapping)) {
    if (!target) continue;
    const field = fields.find(f => f.name === target);
    if (!field) { errors[target] = "Choose an available field."; continue; }
    if (raw[header] === "" || raw[header] == null) continue;
    try { values[target] = convertCell(raw[header], field); }
    catch (error) { values[target] = raw[header]; errors[target] = error instanceof Error ? error.message : "Check this value."; }
  }
  return { values, errors };
}
export function csvText(headers: string[], rows: Values[]) {
  const cell = (value: unknown) => {
    let s = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
    if (typeof value === "string" && /^[\s]*[=+@-]/.test(s)) s = `'${s}`;
    return `"${s.replaceAll('"', '""')}"`;
  };
  return "\uFEFF" + [headers.map(cell).join(","), ...rows.map(row => headers.map(h => cell(row[h])).join(","))].join("\r\n");
}
export function photoMatches(name: string, rows: ImportRowView[], kind: ImportKind) {
  const normal = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const base = name.split("/").pop()!.replace(/\.[^.]+$/, "");
  const names = [normal(base), normal(base.replace(/[-_ ](?:photo|image)?\d+$/i, ""))];
  return rows.filter(row => [row.values.sku, row.values.slug, row.values.email, rowTitle(kind, row.values)].some(key => key && names.includes(normal(String(key))))).map(row => row.id);
}
