#!/usr/bin/env node
/**
 * Public broken-link crawler for linkweonlinemall.com
 * Read-only: GET/HEAD only, no auth, no forms.
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const ORIGIN = "https://www.linkweonlinemall.com";
const MAX_URLS = 150;
const TIMEOUT_MS = 10_000;
const DELAY_MS = 200;

const SEEDS = [
  "/",
  "/shop",
  "/services",
  "/stores",
  "/events",
  "/search",
  "/cart",
  "/login",
  "/register",
  "/contact",
  "/privacy",
  "/terms",
  "/get-app",
];

const SKIP_HREF_RE =
  /\/api\/|\/dashboard\/|\/checkout|mailto:|tel:|javascript:|logout|#|^$/i;

const SKIP_PATH_RE =
  /\/api\/|\/dashboard\/|\/checkout|logout/i;

const MUTATION_QUERY_RE =
  /(^|&)(action|add|delete|remove|submit|pay|checkout|token|reset)=/i;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeUrl(href, baseUrl) {
  if (!href || typeof href !== "string") return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed === "#" || trimmed.startsWith("javascript:")) return null;
  if (trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) return null;

  try {
    const u = new URL(trimmed, baseUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}

function isSameOrigin(url) {
  try {
    return new URL(url).origin === ORIGIN;
  } catch {
    return false;
  }
}

function shouldSkipCrawl(url) {
  try {
    const u = new URL(url);
    if (!isSameOrigin(url)) return true;
    if (SKIP_PATH_RE.test(u.pathname)) return true;
    if (MUTATION_QUERY_RE.test(u.search)) return true;
    return false;
  } catch {
    return true;
  }
}

function shouldRecordHref(href) {
  if (!href) return false;
  if (SKIP_HREF_RE.test(href)) return false;
  if (href.startsWith("#")) return false;
  return true;
}

function extractHrefs(html, baseUrl) {
  const links = new Set();
  const re = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1] ?? m[2] ?? m[3] ?? "";
    if (!shouldRecordHref(raw)) continue;
    const abs = normalizeUrl(raw, baseUrl);
    if (abs) links.add(abs);
  }
  return [...links];
}

function pickDetailLinks(html, baseUrl, patterns, limit = 3) {
  const found = [];
  const re = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1] ?? m[2] ?? m[3] ?? "";
    const abs = normalizeUrl(raw, baseUrl);
    if (!abs || !isSameOrigin(abs)) continue;
    const path = new URL(abs).pathname;
    if (!patterns.some((p) => p.test(path))) continue;
    if (!found.includes(abs)) found.push(abs);
    if (found.length >= limit) break;
  }
  return found;
}

async function fetchWithTimeout(url, method = "GET") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      redirect: "manual",
      headers: {
        "User-Agent": "LinkWe-LinkAudit/1.0 (+read-only; no-login)",
        Accept: method === "HEAD" ? "*/*" : "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function classify(status, error) {
  if (error) return "UNREACHABLE";
  if (status >= 200 && status < 300) return "OK";
  if (status >= 300 && status < 400) return "REDIRECT";
  if (status === 404 || status === 410) return "BROKEN";
  if (status >= 500) return "SERVER ERROR";
  if (status >= 400) return "BROKEN";
  return "UNKNOWN";
}

async function checkUrl(url, method = "GET") {
  try {
    const res = await fetchWithTimeout(url, method);
    const location = res.headers.get("location");
    let body = "";
    if (method === "GET" && res.status >= 200 && res.status < 300) {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("text/html") || ct.includes("application/xhtml")) {
        body = await res.text();
      }
    } else if (method === "GET") {
      try {
        await res.arrayBuffer();
      } catch {
        /* drain */
      }
    }
    return {
      url,
      status: res.status,
      location: location ? normalizeUrl(location, url) : null,
      body,
      error: null,
      classification: classify(res.status, null),
    };
  } catch (err) {
    return {
      url,
      status: null,
      location: null,
      body: "",
      error: err.name === "AbortError" ? "timeout" : String(err.message || err),
      classification: "UNREACHABLE",
    };
  }
}

async function main() {
  const queue = [];
  const crawled = new Set();
  const toCrawl = new Set();
  const linkSources = new Map(); // target -> Set<source>
  const urlResults = new Map(); // url -> result snapshot
  const externalChecked = new Set();

  function addSource(target, source) {
    if (!linkSources.has(target)) linkSources.set(target, new Set());
    linkSources.get(target).add(source);
  }

  function enqueue(url, source = null) {
    if (!url || crawled.has(url) || toCrawl.has(url)) return;
    if (shouldSkipCrawl(url)) return;
    if (toCrawl.size + crawled.size >= MAX_URLS) return;
    toCrawl.add(url);
    queue.push({ url, source });
  }

  // Seed internal pages
  for (const path of SEEDS) {
    enqueue(`${ORIGIN}${path}`, "seed");
  }

  // Bootstrap detail pages from listing pages
  const bootstrapPaths = ["/shop", "/stores", "/events"];
  for (const path of bootstrapPaths) {
    await sleep(DELAY_MS);
    const pageUrl = `${ORIGIN}${path}`;
    const res = await checkUrl(pageUrl, "GET");
    urlResults.set(pageUrl, res);
    crawled.add(pageUrl);
    toCrawl.delete(pageUrl);

    if (res.classification === "OK" && res.body) {
      const patterns =
        path === "/shop"
          ? [/^\/products\/[^/]+$/]
          : path === "/stores"
            ? [/^\/stores\/[^/]+$/, /^\/store\/[^/]+$/]
            : [/^\/events\/[^/]+$/];
      const details = pickDetailLinks(res.body, pageUrl, patterns, 3);
      for (const d of details) enqueue(d, `bootstrap:${path}`);

      const hrefs = extractHrefs(res.body, pageUrl);
      for (const href of hrefs) {
        addSource(href, pageUrl);
        if (isSameOrigin(href) && !shouldSkipCrawl(href)) enqueue(href, pageUrl);
      }
    }
  }

  // BFS crawl
  while (queue.length > 0 && crawled.size < MAX_URLS) {
    const { url } = queue.shift();
    if (crawled.has(url)) continue;
    if (shouldSkipCrawl(url)) {
      crawled.add(url);
      continue;
    }

    await sleep(DELAY_MS);
    const res = await checkUrl(url, "GET");
    urlResults.set(url, res);
    crawled.add(url);
    toCrawl.delete(url);

    const hrefs = res.body ? extractHrefs(res.body, url) : [];
    for (const href of hrefs) {
      addSource(href, url);
      if (isSameOrigin(href)) {
        if (!shouldSkipCrawl(href)) enqueue(href, url);
      }
    }
  }

  // Check all discovered links (internal not crawled + external)
  const allTargets = new Set(linkSources.keys());
  for (const u of crawled) allTargets.add(u);

  for (const target of allTargets) {
    if (urlResults.has(target) && crawled.has(target)) continue;
    await sleep(DELAY_MS);
    let method = isSameOrigin(target) ? "GET" : "HEAD";
    let res = await checkUrl(target, method);
    if (!isSameOrigin(target) && (res.status === 405 || res.status === 501)) {
      res = await checkUrl(target, "GET");
    }
    if (!urlResults.has(target)) urlResults.set(target, res);
    if (!isSameOrigin(target)) externalChecked.add(target);
  }

  // Also check external links found on crawled pages
  for (const pageUrl of crawled) {
    const res = urlResults.get(pageUrl);
    if (!res?.body) continue;
    const hrefs = extractHrefs(res.body, pageUrl);
    for (const href of hrefs) {
      if (isSameOrigin(href)) continue;
      addSource(href, pageUrl);
      if (externalChecked.has(href) || urlResults.has(href)) continue;
      await sleep(DELAY_MS);
      const ext = await checkUrl(href, "HEAD");
      urlResults.set(href, ext);
      externalChecked.add(href);
    }
  }

  // Aggregate stats
  const stats = { OK: 0, REDIRECT: 0, BROKEN: 0, "SERVER ERROR": 0, UNREACHABLE: 0, UNKNOWN: 0 };
  for (const r of urlResults.values()) {
    stats[r.classification] = (stats[r.classification] || 0) + 1;
  }
  const total = urlResults.size;

  const broken = [];
  const redirects = [];
  const external = [];
  const okPages = [];

  for (const [url, r] of urlResults.entries()) {
    const sources = [...(linkSources.get(url) || [])].sort();
    const entry = { url, status: r.status, location: r.location, error: r.error, sources };

    if (r.classification === "OK" && crawled.has(url)) okPages.push(url);
    if (r.classification === "REDIRECT") redirects.push(entry);
    if (r.classification === "BROKEN" || r.classification === "SERVER ERROR" || r.classification === "UNREACHABLE") {
      broken.push(entry);
    }
    if (!isSameOrigin(url)) {
      external.push({ ...entry, classification: r.classification });
    }
  }

  broken.sort((a, b) => a.url.localeCompare(b.url));
  redirects.sort((a, b) => a.url.localeCompare(b.url));
  external.sort((a, b) => a.url.localeCompare(b.url));
  okPages.sort();

  const lines = [];
  lines.push("# LinkWe Live Site — Link Audit Report");
  lines.push("");
  lines.push(`**Target:** ${ORIGIN}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Crawler cap:** ${MAX_URLS} internal pages · read-only GET/HEAD`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(
    `Total URLs checked: **${total}** · OK: **${stats.OK}** · Redirects: **${stats.REDIRECT}** · Broken: **${stats.BROKEN}** · Server errors: **${stats["SERVER ERROR"]}** · Unreachable: **${stats.UNREACHABLE}**`,
  );
  lines.push("");

  lines.push("## BROKEN LINKS (fix these)");
  lines.push("");
  if (broken.length === 0) {
    lines.push("_None found._");
  } else {
    for (const e of broken) {
      const statusStr = e.status != null ? String(e.status) : `unreachable (${e.error})`;
      lines.push(`- **${e.url}** — ${statusStr}`);
      if (e.sources.length) {
        lines.push(`  - Linked from: ${e.sources.map((s) => `\`${s}\``).join(", ")}`);
      } else {
        lines.push("  - Linked from: _(seed / bootstrap only)_");
      }
    }
  }
  lines.push("");

  lines.push("## REDIRECTS (review)");
  lines.push("");
  if (redirects.length === 0) {
    lines.push("_None found._");
  } else {
    for (const e of redirects) {
      lines.push(`- **${e.url}** — ${e.status} → \`${e.location ?? "(no Location header)"}\``);
      if (e.sources.length) {
        lines.push(`  - Linked from: ${e.sources.map((s) => `\`${s}\``).join(", ")}`);
      }
    }
  }
  lines.push("");

  lines.push("## EXTERNAL LINKS");
  lines.push("");
  if (external.length === 0) {
    lines.push("_None checked._");
  } else {
    for (const e of external) {
      const statusStr =
        e.status != null ? `${e.status} (${e.classification})` : `unreachable (${e.error})`;
      lines.push(`- **${e.url}** — ${statusStr}`);
      if (e.sources.length) {
        lines.push(`  - Linked from: ${e.sources.map((s) => `\`${s}\``).join(", ")}`);
      }
    }
  }
  lines.push("");

  lines.push("## PAGES CRAWLED OK");
  lines.push("");
  for (const u of okPages) {
    lines.push(`- ${u}`);
  }
  lines.push("");

  const outPath = resolve(ROOT, "link-audit-report.md");
  writeFileSync(outPath, lines.join("\n"), "utf8");

  console.log("SUMMARY:", lines.find((l) => l.startsWith("Total URLs")));
  console.log("Report written to:", outPath);
  console.log("BROKEN:", broken.length, "REDIRECTS:", redirects.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
