/** Accept a printed ticket number, token, or a LinkWe ticket QR URL. Never fetch scanned URLs. */
export function parseTicketScan(input: string): string | null {
  const value = input.trim();
  if (!value || value.length > 2000) return null;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (!["www.linkweonlinemall.com", "linkweonlinemall.com", "linkwe.tt", "www.linkwe.tt", "127.0.0.1", "localhost"].includes(url.hostname)) return null;
      const match = url.pathname.match(/^\/checkin\/([^/]+)\/?$/);
      return match ? parseTicketScan(decodeURIComponent(match[1])) : null;
    } catch { return null; }
  }
  return /^[a-z0-9_-]{4,200}$/i.test(value) ? value : null;
}
