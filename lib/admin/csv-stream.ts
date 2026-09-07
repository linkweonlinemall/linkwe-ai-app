import { escapeCsvCell } from "@/lib/csv/escape-cell";
/** Fetches one page at a time to keep exports from loading the whole database into memory. */
export function csvDownload(filename: string, headers: string[], fetchPage: (cursor?: string) => Promise<{ id: string; cells: (string | number | null)[] }[]>) {
  let cursor: string | undefined;
  let started = false;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (!started) { controller.enqueue(encoder.encode(`\ufeff${headers.map(escapeCsvCell).join(",")}\r\n`)); started = true; return; }
        const rows = await fetchPage(cursor);
        if (!rows.length) { controller.close(); return; }
        controller.enqueue(encoder.encode(rows.map(row => row.cells.map(escapeCsvCell).join(",")).join("\r\n") + "\r\n"));
        cursor = rows.at(-1)!.id;
      } catch(e) { controller.error(e); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

export function exportDateRange(params: URLSearchParams) {
  function parse(key: string) {
    const value = params.get(key);
    if (!value) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) throw new Error("Use valid YYYY-MM-DD dates.");
    return new Date(`${value}T00:00:00-04:00`);
  }
  const from = parse("from"); const to = parse("to");
  if (from && to && from > to) throw new Error("Start date must be before end date.");
  return { ...(from ? { gte: from } : {}), lt: new Date(Math.min(Date.now(), to ? to.getTime()+86400000 : Date.now())) };
}
