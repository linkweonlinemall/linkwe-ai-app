export function publicQrUrl(value: string): string {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error("Enter a complete LinkWe link, starting with https://."); }
  if (!["https:", "http:"].includes(url.protocol) || !["www.linkweonlinemall.com", "linkweonlinemall.com"].includes(url.hostname) || url.username || url.password || url.port) {
    throw new Error("Use a public page on linkweonlinemall.com.");
  }
  if (!/^\/(?:store|products|service|events)\/[^/]+\/?$/.test(url.pathname) && !["/", "/shop", "/stores", "/services", "/events", "/timeline"].includes(url.pathname)) {
    throw new Error("Choose a storefront, product, service, event or marketplace page that customers can open.");
  }
  url.protocol = "https:";
  url.hostname = "www.linkweonlinemall.com";
  return url.toString();
}

export function qrFilename(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "linkwe-qr";
}

export function escapeQrText(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
