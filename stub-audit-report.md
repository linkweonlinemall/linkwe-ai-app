# LinkWe Stub & Placeholder Audit

**Generated:** 2026-06-02  
**Scope:** Read-only scan of `linkwe-ai-app` source (`.tsx`, `.ts`). No files modified.

---

## SUMMARY

| Category | Finding count | Notes |
|----------|---------------|-------|
| 1. Placeholder copy | **12 user-visible** + **~60 form-field placeholders** (benign) | No `TODO`/`FIXME`/`lorem` in app code |
| 2. Linked-but-missing / dead-end | **11** | Footer mislabels + mailto dead-ends dominate |
| 3. Stub pages | **7** | Mostly footer targets & generic `/dashboard` hub |
| 4. Hardcoded / fake data | **8** | Domain/email mismatches, example URLs |
| 5. Dead code | **5** | Orphan admin tabs + unreachable UI branch |
| 6. Known-incomplete flows | **4 verified** | All mailto-based, no backend waitlist |
| 7. Console / debug leftovers | **6 user-facing** | `StoreLocationPicker` is the worst offender |

### Top things to fix before launch (honest triage)

**User-visible embarrassments (fix first):**
1. Footer **About / Careers / Pricing** all go to `/contact` — visitors expect real pages.
2. Footer **Cookie policy** links to `/privacy` (cookies are a section there, not a dedicated policy).
3. **Services “Notify me”** opens the user’s mail client — no list capture; copy promises “we’ll let you know.”
4. **`/dashboard` hub** still says “will live here” on role cards despite real dashboards existing.
5. **BookingWidget** “Contact provider” uses `mailto:?` with **no recipient email** when no dates are available.
6. Production site is `linkweonlinemall.com` but emails/templates use **`linkwemall.com`** and **`admin@linkwemall.com`**.

**Harmless / internal (lower priority):**
- Form `placeholder="..."` attributes on inputs (normal UX).
- Orphan admin components (`WarehouseTab`, `CouriersTab`, `BayMapTab`) — built but not wired into nav.
- `StoreLocationPicker` verbose `console.log` on checkout (visible in DevTools, not on-screen).
- Admin courier detail “coming soon” (admin-only).

**Not issues:**
- `href="#browse-categories"` and `href="#shop-this-event"` — valid in-page anchors; targets exist.
- `Not yet` on order “Mark received” — cancel button label, not placeholder copy.
- Contact form — wired to `POST /api/contact` (real backend).

---

## 1. PLACEHOLDER COPY

### User-visible / copy debt

| File | Line / snippet | Description |
|------|----------------|-------------|
| `app/(dashboard)/dashboard/page.tsx` | L12: `"Orders, wishlists, and AI shopping assistance will live here."` | Generic dashboard hub card copy for CUSTOMER role — reads unfinished. |
| `app/(dashboard)/dashboard/page.tsx` | L17: `"Store settings, catalog tools, and payouts will live here."` | Same for VENDOR role card. |
| `app/(dashboard)/dashboard/page.tsx` | L22: `"Assignments, routes, and proof-of-delivery will live here."` | Same for COURIER role card. |
| `app/(dashboard)/dashboard/page.tsx` | L27: `"Internal controls and moderation will live here."` | Same for ADMIN role card. |
| `app/(dashboard)/dashboard/admin/users/admin-user-detail.tsx` | L330: `Detailed courier stats coming soon.` | Admin user detail shows placeholder instead of courier metrics. |
| `app/services/ServicesClient.tsx` | L584: `title="Services launching soon"` | Empty-state heading when no services exist in DB. |
| `app/services/ServicesClient.tsx` | L585–586: `description="Local service providers are joining LinkWe..."` / `actionLabel="Notify me"` | Marketing empty state; action is mailto-only (see §6). |
| `app/(dashboard)/dashboard/admin/components/admin-dashboard.tsx` | L162: `This section is being built.` | Fallback panel for unknown admin tabs (currently unreachable — see §5). |
| `app/my-tickets/page.tsx` | L300: `{/* Step 5b/5c placeholder — QR code + PDF download */}` | Dev comment; QR/PDF are implemented below — comment is stale. |
| `lib/shipping/trinidad-zoning.ts` | L5: `checkout not wired yet` | Code comment — region data may be provisional for shipping. |
| `app/(dashboard)/dashboard/admin/components/bay-map-tab.tsx` | L214–216: `Run npx prisma db seed to create 20 bays` | Admin-only empty-state ops message if bays not seeded. |
| `components/services/ServicesLaunchNotifyModal.tsx` | L81: `Opens your email app — we won't add you to a list automatically.` | Honest disclaimer that notify flow is not a real signup. |

### Grep patterns with **no app-code hits**

- `TODO`, `FIXME`, `lorem ipsum`, `under construction`, `WIP`, `TBD`, `dummy`, `changeme`, `replace me`, `test@` — **none** in `.tsx`/`.ts` app code.

### Form-field placeholders (benign — ~60 hits)

These match grep patterns but are normal input hints, not stub pages:

| Pattern | Example files |
|---------|-----------------|
| `placeholder="..."` | Widespread: checkout, search, vendor forms, admin tables |
| `placeholder="868 123 4567"` | `app/checkout/checkout-client.tsx` L474 |
| `placeholder="you@example.com"` | `app/(auth)/forgot-password/page.tsx` L61 |
| `placeholder="email@example.com"` | `app/my-tickets/[ticketId]/TransferTicketPanel.tsx` L136 |
| `placeholder="yourpage"` / `yourchannel` / `yourprofile` / `yourwebsite.com` | `app/(dashboard)/dashboard/vendor/store/edit/page.tsx` L359–449 |
| `your-slug` in helper text | `product-edit-form.tsx` L323, `product-form.tsx` L258 |
| `placeholder="XXX-XXXX"` | `step-1-form.tsx` L91, courier onboarding L152 |
| `placeholder="+1 868 XXX XXXX"` | `ProfileForm.tsx` L76, `courier-dashboard-client.tsx` L315 |

### Code-internal “placeholder” names (not user copy)

| File | Snippet | Description |
|------|---------|-------------|
| `components/chat/ShoppingChat.tsx` | `ProductsLoadingPlaceholder`, `showPlaceholder` | Streaming UI loading state — not stub content. |
| `components/storefront/StorefrontTabs.tsx` | `PLACEHOLDER_COLORS` | Color array for product cards without images. |
| `app/(dashboard)/dashboard/admin/components/admin-dashboard.tsx` | `placeholderIcon` | Variable name for tab icon in fallback panel. |

### Legitimate “not yet” (status labels — not placeholder debt)

| File | Snippet | Description |
|------|---------|-------------|
| `lib/orders/order-status.ts` | L17: `Order not yet placed` | Order status description. |
| `app/orders/components/mark-received-button.tsx` | L29: `Not yet` | Cancel button on confirm dialog. |
| `app/(dashboard)/dashboard/admin/components/orders-tab.tsx` | L1197: `not yet shipped` | Admin order status explanation. |
| `app/(dashboard)/dashboard/admin/components/ticket-orders-tab.tsx` | L236: `Earnings not yet released` | Ticket payout status label. |

---

## 2. LINKED-BUT-MISSING / DEAD-END PAGES

| File | Line / snippet | Description |
|------|----------------|-------------|
| `components/layout/SiteFooter.tsx` | L74: `<Link href="/contact">About LinkWe</Link>` | Label says About; destination is generic contact page. |
| `components/layout/SiteFooter.tsx` | L76: `<Link href="/contact">Careers</Link>` | No `/careers` route exists. |
| `components/layout/SiteFooter.tsx` | L68: `<Link href="/contact">Pricing</Link>` | No pricing page; lands on contact. |
| `components/layout/SiteFooter.tsx` | L84: `<Link href="/privacy">Cookie policy</Link>` | No `/cookies` route; privacy page has a Cookies section (L157+) but not a standalone policy. |
| `components/service/BookingWidget.tsx` | L616: `href="mailto:?subject=Booking enquiry"` | Mailto with **empty recipient** when provider has no availability. |
| `app/(storefront)/stores/[slug]/page.tsx` | Full page at `/stores/[slug]` | Alternate store page exists but **no nav/links** point here; site uses `/store/[slug]` everywhere. |
| `app/(dashboard)/dashboard/admin/listings/page.tsx` | Route `/dashboard/admin/listings` | Full admin listings UI exists but **not linked** from `admin-shell.tsx` nav. |
| `components/layout/HeroSlider.tsx` | L167: `href="#browse-categories"` | In-page anchor — **OK** (`app/page.tsx` L320 has `id="browse-categories"`). |
| `app/events/[slug]/page.tsx` | L282: `href="#shop-this-event"` | In-page anchor — **OK** (`RelatedContentSection.tsx` L24). |
| `app/(dashboard)/dashboard/admin/components/admin-dashboard.tsx` | L149–163 | Fallback “being built” panel for invalid `?tab=` — unreachable with current `TAB_IDS`. |
| `lib/email/templates.ts` | L35–36: `https://linkwemall.com/privacy` / `terms` | Email footer links may 404 or wrong host vs production `linkweonlinemall.com`. |

### Routes referenced in UI with **no** `page.tsx` (expected gaps)

| Referenced label / intent | Expected path | Status |
|---------------------------|---------------|--------|
| About LinkWe | `/about` | **Missing** — footer uses `/contact` |
| Careers | `/careers` | **Missing** |
| Pricing | `/pricing` | **Missing** — footer uses `/contact` |
| Cookie policy (standalone) | `/cookies` | **Missing** — footer uses `/privacy` |
| FAQ / Help / Blog / Returns / Shipping info | — | **Not linked** in footer; no routes found |

### Routes that **do** exist for footer targets

| Link | Page file |
|------|-----------|
| `/shop`, `/services`, `/stores`, `/events` | `app/shop/page.tsx`, `app/services/page.tsx`, `app/(storefront)/stores/page.tsx`, `app/events/page.tsx` |
| `/contact` | `app/contact/page.tsx` (real form + `POST /api/contact`) |
| `/privacy`, `/terms` | Substantive legal pages (`app/privacy/page.tsx`, `app/terms/page.tsx`) |

---

## 3. STUB PAGES

| File | Description |
|------|-------------|
| `app/(dashboard)/dashboard/page.tsx` | Generic hub: welcome + role cards with “will live here” copy; real dashboards are at `/dashboard/{role}` and linked, but this page feels like a scaffold. |
| `app/contact/page.tsx` | Serves triple duty as **Contact**, **About**, **Careers**, and **Pricing** per footer — no dedicated content for those labels. |
| `app/privacy/page.tsx` | Serves **Privacy** + **Cookie policy** per footer; cookies are §8 inside privacy, not a separate page. |
| `app/services/ServicesClient.tsx` | When `initialServices.length === 0`, shows “Services launching soon” + Notify mailto empty state (may show on live site if no published services). |
| `app/(storefront)/stores/[slug]/page.tsx` | Simpler duplicate store profile; superseded by `app/store/[slug]/page.tsx` in all product links. |
| `app/(dashboard)/dashboard/admin/listings/page.tsx` | Complete admin listings manager, but hidden from admin navigation (orphan). |
| `app/offline/page.tsx` | Intentional PWA offline page — minimal but complete (not a launch blocker). |

**Not stubs (verified real content):**
- `app/(dashboard)/dashboard/customer/page.tsx` — full DB-backed customer hub.
- `app/get-app/page.tsx` + `GetAppClient.tsx` — real PWA install flow.
- `app/chat/page.tsx` — AI shopping chat (wired).
- `app/contact/ContactForm.tsx` — posts to `/api/contact`.

---

## 4. HARDCODED / FAKE DATA

| File | Line / snippet | Description |
|------|----------------|-------------|
| `lib/email/templates.ts` | L35–36: `https://linkwemall.com/privacy` | Email footer uses `linkwemall.com`, not `linkweonlinemall.com`. |
| `app/checkout/checkout-client.tsx` | L474: `placeholder="868 123 4567"` | Example T&T phone format in checkout (placeholder only). |
| `app/(dashboard)/dashboard/vendor/products/new/product-form.tsx` | L258: `linkwe.com/products/${slug \|\| "your-slug"}` | Vendor helper shows wrong domain (`linkwe.com` vs live host). |
| `app/(dashboard)/dashboard/vendor/products/[id]/edit/product-edit-form.tsx` | L323: same `linkwe.com/products/...` | Same wrong-domain helper. |
| `app/contact/page.tsx` + legal pages | `admin@linkwemall.com` | Consistent support email, but domain differs from `linkweonlinemall.com` brand URL. |
| `components/tickets/TicketDocument.tsx` | L332: `Contact admin@linkwemall.com` | Printed on PDF tickets. |
| `app/api/search/route.ts` | L12–48: `?debug=smoke` returns `sampleProducts` / `sampleStores` | Debug API endpoint exposes DB samples (not user UI, but public if deployed). |
| `app/(dashboard)/dashboard/admin/components/bay-map-tab.tsx` | L214–216 | Hardcoded “20 bays” + seed instruction — ops placeholder if DB empty. |

**Ratings/counts:** Store, product, and service ratings are computed from Prisma review aggregates (`lib/search/run-search.ts`, `app/actions/public-stores.ts`, etc.) — **no fake ratings found** in public UI.

---

## 5. DEAD CODE (light pass)

| File | Evidence | Description |
|------|----------|-------------|
| `app/(dashboard)/dashboard/admin/components/warehouse-tab.tsx` | `export default function WarehouseTab` — **zero imports** | Full warehouse queue UI (~1100 lines) never mounted. |
| `app/(dashboard)/dashboard/admin/components/couriers-tab.tsx` | `export default function CouriersTab` — **zero imports** | Full couriers admin tab never mounted. |
| `app/(dashboard)/dashboard/admin/components/bay-map-tab.tsx` | `export default function BayMapTab` — **zero imports** | Dock bay map UI never mounted. |
| `app/(dashboard)/dashboard/admin/components/admin-dashboard.tsx` | L149–163 unreachable branch | All `TAB_IDS` have real tab components; fallback “being built” never runs. |
| `app/(storefront)/stores/[slug]/page.tsx` | No inbound links from app | Duplicate store route; dead path for normal navigation. |

---

## 6. KNOWN-INCOMPLETE FLOWS (verified in code)

### (a) ServicesLaunchNotifyModal — mailto only

| File | Snippet | State |
|------|---------|-------|
| `components/services/ServicesLaunchNotifyModal.tsx` | L36–38: builds `mailto:admin@linkwemall.com?subject=...&body=...` then `window.location.href = ...` | **Confirmed:** no Server Action, no DB, no Resend. Opens mail client. |
| `app/services/ServicesClient.tsx` | L586–587, L709 | “Notify me” button opens modal above. |
| Modal copy L81 | `Opens your email app — we won't add you to a list automatically.` | Explicitly admits no list capture. |

### (b) Footer Cookie / About / Careers targets

| Footer label | `SiteFooter.tsx` href | Actual destination |
|--------------|----------------------|-------------------|
| About LinkWe | `/contact` | Contact page only |
| Careers | `/contact` | Contact page only |
| Pricing | `/contact` | Contact page only |
| Cookie policy | `/privacy` | Privacy policy §8 Cookies |

### (c) Other mailto “notify / upgrade” flows (no backend)

| File | Flow | Backend |
|------|------|---------|
| `app/(dashboard)/dashboard/vendor/components/tabs/finance-tab.tsx` L299–302 | “Upgrade Plan” → `mailto:admin@linkwemall.com?subject=Subscription Upgrade Enquiry` | Mailto only |
| `components/service/BookingWidget.tsx` L615–619 | “Contact provider” when no dates | `mailto:?` — broken recipient |
| `app/contact/page.tsx` L50–71 | Support cards | Intentional mailto links (not waitlist) |

**Contact form** (`ContactForm.tsx` → `POST /api/contact` → Resend to `admin@linkwemall.com`) **is** wired to a real backend.

---

## 7. CONSOLE / DEBUG LEFTOVERS (user-facing pages)

| File | Snippet | Exposure |
|------|---------|----------|
| `components/storefront/StoreLocationPicker.tsx` | L50–360: ~20× `console.log` / `console.warn` with `[StoreLocationPicker/geolocation]` | **Checkout** (`checkout-client.tsx` L452), vendor store edit, on-demand widget — visible in browser DevTools |
| `components/events/EventFilters.tsx` | L191: `console.log("[EventFilters] debounced search →", ...)` | Public `/events` page filters |
| `components/pwa/ServiceWorkerRegistration.tsx` | L11: `console.log("SW registered:", ...)` | All pages (layout) — low noise |
| `app/(dashboard)/dashboard/courier/components/courier-dashboard-client.tsx` | L151: `console.warn("Location tracking error:", ...)` | Courier dashboard |
| `app/actions/password-reset.ts` | L50: `console.log("PASSWORD RESET EMAIL SENT TO:", user.email)` | **Server** log — not browser UI |
| `lib/prisma.ts` | L17–22: DATABASE_URL host logging | **Server** startup only |

**Not found:** `debugger` statements in app code.

**Scripts only (not user-facing):** `scripts/check-filters.ts`, `scripts/check-staff.ts`, `scripts/check-id-urls.ts`, `prisma/seed.ts`.

---

## Files created

- `stub-audit-report.md` (this file)
