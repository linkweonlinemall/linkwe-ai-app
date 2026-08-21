# LinkWe — AI session context

**Last updated:** 1 June 2026 (tickets Step 4, payment fixes, AI chat improvements)

Reference document for assistants working in this repository. Paths are relative to the project root unless noted.

---

## Recent Changes (since initial context generation)

Summary of notable additions and refactors. Re-scan the repo after large merges.

### 1 June 2026 — Tickets Step 4, payment fixes, AI chat improvements (complete)

#### Events & Ticketing — Step 4 complete
- **Stripe ticket purchase flow** (`app/actions/ticket-checkout.ts`, `components/events/TicketPurchaseCard.tsx`) — inline Stripe Elements on `/events/[slug]`; creates `TicketOrder` + `Ticket` records; `PaymentIntent` with `ticketOrderId` metadata.
- **Webhook** (`app/api/webhooks/stripe/route.ts`) — branches on `metadata.ticketOrderId`; handled by `handleTicketOrderPaid`; idempotent (status guard prevents double-processing on retries); no `revalidatePath` in webhook context.
- **New schema** — `TicketOrder` model, `TicketOrderStatus` enum (`PENDING` → `PAID` → `CANCELLED`), `TICKET_PURCHASED` notification type, `Ticket.orderId` relation. Migration `20260531212600_add_ticket_order` applied to production via manual SQL in Neon editor (see migration drift note below).
- **Email** — `ticketConfirmationEmail` template in `lib/email/templates.ts`.
- **Ticket purchases run on a SEPARATE rail** — no `MainOrder`/`SplitOrder`/warehouse involvement.

**Still TODO (ticketing):**
- Step 5: `/my-tickets` page (currently 404 placeholder), QR codes, PDF tickets
- Step 6: Offline QR scanner for vendor door check-in
- Step 7: Event products/services on event page
- Step 8: Promo codes, waitlist auto-promotion, ticket transfer

#### Booking/service payments — production bugs fixed
- **Root causes of "stuck on processing":** wrong Stripe webhook URL (307 redirect), missing `STRIPE_WEBHOOK_SECRET` in Vercel, `revalidatePath` crash inside webhook context (E263), AND production DB missing columns from migration `20260518180000_add_completion_and_earnings`.
- **Fixes:** webhook URL now `https://www.linkweonlinemall.com/api/webhooks/stripe`; `STRIPE_WEBHOOK_SECRET` set in Vercel env; `revalidatePath` calls wrapped in `try/catch` in `lib/finance/booking-payment.ts`; booking webhook made idempotent (status guard).

#### AI chat improvements (Rex + Zara)
- **Image URL validation** — `isTrustedHostedImageUrl` extracted to `lib/images/trusted-host.ts` (not a `"use server"` file); `upload_event_cover_image` and `upload_event_gallery_image` tool handlers in `app/api/vendor-ai/route.ts` now reject non-Cloudinary URLs; Rex system prompt updated. Rex can no longer save hallucinated/broken image URLs.
- **Markdown spacing** — paragraph `marginBottom`, `lineHeight`, and list/heading spacing improved in all three chat components.
- **Real token streaming** — `app/api/vendor-ai/route.ts` and `app/api/chat/route.ts` now emit text deltas via `messageStream.on("text", ...)` instead of buffering to final message.
- **Typewriter display buffer** — all three chat components (`floating-ai-chat.tsx`, `ai-assistant/page.tsx`, `ShoppingChat.tsx`) buffer received deltas in `buf.pending` and drain at 5/10/20 chars per `requestAnimationFrame` (adaptive). `finalized` guard prevents double-finalization on error. No backend changes.
- **Zara products loading placeholder** — incomplete ` ```products``` ` blocks masked behind "Finding products for you…" while streaming; `isStreaming: true` held throughout drain; `isStreaming: false` only set in `doFinalize` after last char displayed.
- **Full-page Rex image upload** — `app/(dashboard)/dashboard/vendor/ai-assistant/page.tsx` now has mid-conversation image attach: paperclip button, thumbnail strip above input, `uploadVendorChatImages` upload, base64 vision content to Anthropic, `focusEventId` state wired. Reuses existing server action; no new upload pipeline.
- **Formatting toolbar removed** — vestigial B/I/bullet/numbered/clear toolbar removed from full-page Rex input along with all dead helpers (`stripMarkdown`, `insertAtCursor`, `wrapSelection`, `selectionRef`, `updateSelection`, `inputFocused`).

#### Open risks / TODO before public launch ⚠️
- **RESOLVED 2026-08-14:** Neon `neondb_owner` credentials were rotated and both Vercel `DATABASE_URL` and `DIRECT_URL` were updated the same day; metadata reverified 2026-08-20 without revealing secrets.
- **AUDITED 2026-08-20:** production has 75 distinct migration names matching the repository, with no unfinished migrations. The previously flagged completion/earnings and ticket-order migrations are recorded as applied. One non-blocking legacy drift remains: seven availability columns from a zero-step resolved migration are absent on the unused `Service` table; live services use `Product` and its availability columns are present. **Never run `prisma migrate dev/reset` against production.**
- **RESOLVED 2026-08-13:** Stripe webhook failures return generic public errors; detailed exceptions remain only in server logs with a correlation ID (`0da5970`). Live invalid-signature response reverified 2026-08-20.
- **RESOLVED 2026-08-20:** paid ticket-order claiming, payout eligibility, and every `quantitySold` increment now commit atomically; failures roll back for safe Stripe retry instead of being swallowed.

---

### 31 May 2026 — Admin dashboard mobile optimisation (complete)

All admin tabs made mobile-responsive (Kyle uses admin on phone). Method: one component at a time, screenshot-verified at 375px. Rule held throughout: **desktop (`>=md`) untouched; mobile (`<md`) branches PRESENTATION ONLY** — never fork list/data logic into a separate mobile component (prevents the received-count / readiness-calc drift seen earlier in the desktop pass).

**Shell + nav** — `admin-shell.tsx`. Desktop: fixed ~220px sidebar unchanged. Mobile: sidebar hidden, hamburger in header opens a slide-out left drawer with full grouped nav (Operations / Catalog / People / System). Tap link = navigate + close; backdrop / ESC close. Bottom bar rejected: 13 destinations across 4 groups exceed bottom-bar capacity.

**Leaflet z-index bug fixed** — Leaflet map rendered on top of the open drawer (Leaflet sets high z-index on panes / zoom control). Fix: raised drawer/backdrop above Leaflet (`z-[1100]` backdrop, `z-[1200]` panel); did NOT lower Leaflet globally.

**Tab-by-tab (all table → stacked-card reflows unless noted):**

| Tab | File | Mobile change |
|---|---|---|
| Orders | `orders-tab.tsx` | Rows → stacked cards; expand panel stacks (Line items / Vendor Fulfillment / Financials); INVARIANT preserved (SHIPPED+ always shows N-of-N) |
| Warehouse | `warehouse-tab.tsx` | Rows → cards; bay badge + method pill + drop-off(blue)/courier(red) accent; Mark-as-Received intact |
| Users | `admin-users-client.tsx` | Rows → cards; JOINED date (was clipped) fully visible; Active pill + Suspend/Delete inline |
| Verification | `verification-client.tsx` | **Drill-down** (not stacked): full-width queue → tap vendor → full-screen dossier with `← Queue` back control. Approve/Reject visible at top (were cut off). Checklist / ID doc / gallery / bank / products all stack; lightbox reused. `mobileView` state drives which panel shows; auto-select does NOT trigger `setMobileView("dossier")`. |
| Stores | `admin-stores-client.tsx` | Card-internal cleanup (not full reflow): name `line-clamp-2`; View/status/delete on own row below; metadata grouped; delete kept visually distinct (red `bg-red-50`) |
| Map | `map-tab.tsx` | Sizing polish: stat cards → 2×2 grid (flex-col on mobile, icon above value, no label-wrapping); map `h-[55vh] md:h-[580px]`; inner div `height: 100%`; `invalidateSize` on init |
| Customers | `customers-tab.tsx` | Rows → cards; Total Spent (was clipped off right edge) fully visible |
| Couriers | `couriers-tab.tsx` | Rows → cards; Balance (was clipped) fully visible; green active accent (`#1B8C5A`) preserved; All Couriers / Payout Requests tab pair preserved; expanded detail panel inner tables wrapped in `overflow-x-auto` |

**Pattern used in every table reflow:**
1. `<div className="hidden overflow-x-auto md:block">` wraps the desktop table (unchanged).
2. `<div className="md:hidden">` sibling contains the mobile card list.
3. Both read the same filtered/sorted array and call the same handlers — zero logic duplication.

**Recurring lesson (reaffirmed):** anything keyed off `?tab=` or status counts must use reactive reads and ONE shared calculation feeding all consumers; branch presentation at the breakpoint, never fork the logic.

**Still open (non-blocking):**
- Verification bank-reveal reset on mobile: need to confirm switching vendors actually re-masks. If it carries over, one-line patch (`setRevealAccountNumber(false)` is already in every row click; may need verification on device).
- Verification CSV/PDF exports still contain full account numbers — masking is screen-only. Data-handling decision pending.
- Minor: blue focus ring on tapped Customers cards — folds into a future polish pass.

---

### 31 May 2026 — Admin dashboard redesign (complete)

Full visual + structural redesign of `/dashboard/admin` to LinkWe brand. Unified shell + per-tab passes.

**Shared shell** — `app/(dashboard)/dashboard/admin/layout.tsx` renders `admin-shell.tsx`: dark `#1C1C1A` header (LinkWe logo, scarlet ADMIN pill, single account dropdown), grouped left sidebar (Operations / Catalog / People / System). All admin pages inherit it; per-page headers removed; parent `(dashboard)/layout.tsx` skips its header on admin paths via `isAdminShell`. Active state via `usePathname()` + `useSearchParams()` (derived, not effect-based). Content area scrolls (`overflow-y-auto`) within the locked `dvh` parent. URLs unchanged (mix of `?tab=` and `/admin/x`).

**Overview (Command Center)** — three bands: Needs Attention (conditional action cards, scarlet/amber/blue tints, hidden when count 0, all-clear state) → Today (4 metric cards + 4-stage pipeline cards, calm zeros) → Platform (recent orders + totals, black panel removed, neutral quick-actions w/ one scarlet primary).

**Orders (fulfillment cockpit)** — `app/(dashboard)/dashboard/admin/components/orders-tab.tsx`. Rows show "X of N received" + readiness label + staleness ("Open Xd" scarlet past 48 h) + destination region; full-row floods → left-edge accents. Four groups: Needs action (`READY_TO_SHIP`, `PACKING_COMPLETE`) / Waiting on vendors / In motion (`SHIPPED`, `CUSTOMER_RECEIVED`) / Completed. Two received-count definitions: display (`COURIER_ASSIGNED` onward) vs engine `recalculateMainOrderStatus` (`AT_WAREHOUSE` onward) — intentional two-step intake. Labels "In transit to warehouse" / "Awaiting check-in" distinguish. INVARIANT GUARD: `SHIPPED`/`CUSTOMER_RECEIVED`/`DELIVERED`/`COMPLETED` always show N of N. `DRAFT`/`PENDING_PAYMENT` excluded at query level (`app/actions/admin-orders.ts`). Expand panel reorganised; existing Bundle & dispatch / Mark complete preserved.

**Warehouse / Bay Map** — `warehouse-tab.tsx` / `bay-map-tab.tsx`. Row floods → left-edge accents (matches Orders); scarlet selection; time-in-bay/age urgency escalates to scarlet past threshold.

**Vendors (payouts)** — `vendors-tab.tsx`. Decision-first payout cards: request amount as visual anchor, coverage line ("covered by balance · $X remaining · bank valid"), masked account (last-4). Existing approve/reject preserved.

**Verification (vendor eligibility dossier)** — `admin/verification/verification-client.tsx` + `page.tsx`. Queue + scrollable sectioned panel:
- Readiness checklist (N/8 checks, real data, amber warnings for gaps)
- Identity (ID doc + click-to-zoom lightbox, name/email/phone)
- Store profile (logo, name, slug, tagline, desc, category, region, tags, opening hours, status pill)
- Gallery (thumbnails, clickable lightbox)
- Bank (masked + reveal toggle, resets on vendor switch)
- Products (up to 10 inline + "+N more" computed from `_count.products - shown`, total shown in header)

Single shared `vendorReadiness(vendor)` function drives the sidebar badge (`N/8`), the "Ready" filter tab count (all-8-pass), and the dossier checklist header — they can never disagree. Query expanded read-only (`User.phone` + full `storesOwned` fields + `_count`); no schema migration needed. Zoom overlay generalised to `zoomUrl: string | null` so ID doc and gallery images share one lightbox.

**Recurring lesson:** anything keyed off `?tab=` or status counts must use reactive reads (`useSearchParams`) and shared calculations, not one-time/duplicated logic — bit us 3× on Orders/shell, once on Verification sidebar.

**Deferred (noted, not done):**
- CSV/PDF exports still contain full account numbers — masking is screen-only.
- Orders "all received but not auto-advanced to `READY_TO_SHIP`" — confirmed intended (warehouse check-in is a separate manual step), not a bug.

---

### 30 May 2026 — Events & Ticketing system (Steps 1–3)

**Active phase:** Pre-launch + Admin tooling + Events & Ticketing build in progress.

**Current task:** Admin dashboard redesign to match LinkWe brand identity (scarlet `#D4450A`, dark nav `#1C1C1A`, Sora font, white cards with subtle borders).

#### Events system — completed
- **Schema** (`prisma/schema.prisma`) — `Event`, `EventTicketType`, `Ticket`, `EventPromoCode`, `EventWaitlist` models; `lineup Json?` field on `Event` stores performer array.
- **Vendor event management** — Create (`app/(dashboard)/dashboard/vendor/events/new/page.tsx`), edit (`EditEventForm.tsx`), publish flow, bulk event listing (`app/(dashboard)/dashboard/vendor/events/page.tsx`).
- **Ticket types editor** — Inline editor with colour swatches inside the event form; `EventTicketType` rows saved via server actions.
- **Entertainment & Lineup** — `components/events/LineupEditor.tsx`: inline add-performer form with Cloudinary photo upload (`uploadLineupImage` server action, folder `events/lineup`), circular previews, type badges. Edit and new forms both include the section.
- **Public events discovery** — `app/events/page.tsx`: dark hero with Cloudinary background image (`https://res.cloudinary.com/dosxxjwnh/image/upload/v1780164845/events-hero_bfhevo.png`), category filters, region filter, AJAX keyword search, `EventCard` grid.
- **Public event detail page** — `app/events/[slug]/page.tsx`: full-bleed 520px hero, quick-info strip, About section, Entertainment & Lineup section, gallery, ticket purchase card (`TicketPurchaseCard`), share button, organiser card.
- **Lineup lightbox** — `components/events/LineupLightbox.tsx`: clickable performer grid; fullscreen `87vw × 87vh` overlay with bottom-gradient name/role/badge overlay, ESC + backdrop-click to close.
- **Nav & homepage** — Events link added to main public nav and homepage feature sections.
- **Rex (vendor AI)** — 6 new event management tools: `create_event`, `update_event`, `publish_event`, `list_events`, `create_ticket_type`, `delete_ticket_type`.
- **Zara (customer AI)** — Events awareness added to system prompt (`lib/chat/systemPrompt.ts`); `search_events` tool in `app/api/chat/route.ts` queries published events by keyword, category, region, and date filter.

#### Admin & platform improvements — completed (30 May 2026 evening)
- **Admin user management** — `app/(dashboard)/dashboard/admin/users/page.tsx` + `admin-users-client.tsx` + `admin-user-detail.tsx`: full user table with search, role filter pills (All/Customers/Vendors/Couriers/Admins), paginated 20/page. Clickable row opens a slide-over detail panel with role-specific stats: vendors see store performance (earnings, orders, pending orders, products, bookings, on-demand requests, avg review rating); customers see activity (orders placed, total spent, bookings, requests, reviews written); couriers see region/vehicle info. Bulk select with header checkbox, bulk suspend and bulk delete (skips users with orders, returns skipped list with reasons). Single-row inline suspend/unsuspend and two-step delete confirmation. "Users" nav link added to admin nav bar (same pattern as Products/Stores/Verification).
- **Category picker redesign** — `components/ui/CategoryPicker.tsx`: visual emoji grid replacing the old `<select>` dropdown in vendor onboarding step 3 (`app/(app)/onboarding/business/step-3/step-3-form.tsx`) and store edit page (`app/(dashboard)/dashboard/vendor/store/edit/page.tsx`). `grid-cols-3 gap-2`, 27 categories across 6 groups (Retail & Products, Food & Hospitality, Services, Events & Entertainment, Real Estate & Vehicles, Other), scarlet selected state, group headings, hidden input for form submission.
- **`suspended` field on User** — Added `suspended Boolean @default(false)` to `User` model in `prisma/schema.prisma`; migration `20260530220000_add_user_suspended` applied. Server actions: `suspendUser`, `unsuspendUser`, `bulkSuspendUsers`, `bulkDeleteUsers` in `app/actions/admin-users.ts`.
- **Production Neon database synced** — All pending migrations applied to production (Neon) via `npx prisma migrate deploy` including `add_events_ticketing_system`, `add_event_lineup`, `add_event_ticket_cart`, and `add_user_suspended`.
- **Pre-launch production push** — Successful deploy to production resolving homepage crash (`Invalid prisma.event.findMany() invocation`).

#### Still to build
- ~~**Step 4:** Ticket purchase Stripe integration (payment intent, webhook, order record)~~ — **COMPLETE** (see 1 June 2026)
- **Step 5:** QR ticket delivery and PDF ticket generation
- **Step 6:** Offline QR scanner for vendor door check-in
- **Step 7:** Event products and services integration (merchandise, add-ons)
- **Step 8:** Promo codes, waitlist auto-promotion, ticket transfer between customers
- **Vendor subscription tiers and billing** — STARTER / GROWTH / PRO tier upgrade flow
- **Vendor onboarding tour** — Guided first-run experience after store setup
- **Live messaging** — Real-time customer ↔ vendor chat (currently `VendorChat` model exists but basic)
- **Social timeline** — Vendor posts and customer activity feed

---

### 28 May 2026 (end of day)

#### Product detail page (`/products/[slug]`)
- **`app/products/[slug]/page.tsx`** — Full-width content shell (`w-full px-8`); 3-column grid `1fr 1.2fr 360px` with `lg:gap-10`; tablet 2-col + buy box full width; mobile single column with edge-to-edge gallery (`-mx-8`), info `px-4`.
- **`ProductCollapsibleTags.tsx`** — Tags: 5 visible desktop / 3 mobile; “+ X more” pill; “Show less”; design-token pill styles.
- **`FrequentlyBoughtTogether.tsx`** — Amazon-style horizontal bundle: current product (“This item”, always selected) + up to 3 same-store items with `+` / `=` dividers, checkboxes, total + “Add all to cart”; stacked on mobile; placed in info column `mt-6` below Product Details (24px gap).
- **`ProductBuyBox.tsx`** — Optional `mobileStickyBar` prop: on `<md`, hides in-flow price/CTA and shows fixed bottom bar (price + Add to cart); PDP passes `mobileStickyBar`.
- **`ProductGallery.tsx`** — Mobile: 60px horizontal-scroll thumbnails; desktop: 80px wrap.

#### Universal search — reliability & in-page AJAX
- **`lib/search/types.ts`** — `emptyUniversalSearchResponse()`, `normalizeUniversalSearchResponse()` so clients never see `null` `results` or undefined `total`.
- **`GET /api/search`** — Short/invalid `q` returns empty normalized JSON; errors return empty shape (200), not broken payloads.
- **`app/search/page.tsx`** — No redirect to `/` when `q` missing; empty `/search` allowed (popular searches / type to search).
- **`SearchPageClient.tsx`** — Debounced `headerQuery` → `router.replace` for live URL updates; loading spinner in search bar; safe `products` / `services` / `stores` / `resultTotal` derived from normalized `data`.
- **`lib/hooks/use-search.ts`** — Preview responses normalized before cache/state.

#### Public nav & mobile chrome
- **`PublicNav.tsx`** — `MobileSearchOverlay` for mobile search; header `overflow-visible`; store routes use `transparent` glass header over hero; bottom **Search** tab → `/search` (not shop anchor).
- **`NavSearchInput.tsx`** — Dropdown positioning fixes; mobile full-height results panel.

#### Vendor dashboard — schema lag / production DB
- **`lib/vendor/vendor-split-order-query.ts`** — Safe `vendorSplitOrderListSelect` / detail selects (omit unmigrated columns like `earnings_released`, `completed_at` on list paths); used by vendor home + orders pages.
- **`lib/vendor/vendor-service-query.ts`** — Safe service list/detail/availability selects + `findVendorServicesForAvailability()` fallback when availability columns missing; wired in `app/actions/services.ts` and service edit page.
- **`scripts/neon-product-availability-columns.sql`** — Idempotent Neon migration for Product availability columns (`durationMinutes`, `bufferMinutes`, `useStoreHours`, etc.).
- **`app/(dashboard)/dashboard/vendor/staff/page.tsx`** — Availability UI (`AvailabilityClient`): weekly store hours + per-service schedules (route still `/staff`).

#### Vendor mobile nav
- **`vendor-mobile-bottom-nav.tsx`** — **More** opens bottom sheet (services, bookings, staff/availability, store, listings, finance, reviews, settings, home, sign out) instead of linking More → settings only.

#### Finance, cron, deploy
- **`lib/finance/commission.ts`** — Plan rates (`STARTER` / `GROWTH` / `PRO`) for product vs service; `calculateEarnings`, minor-unit helpers.
- **`GET /api/cron/auto-complete`** — Auto-complete bookings (`autoCompleteAt`) and `DELIVERED` split orders; `x-cron-secret: CRON_SECRET`.
- **`vercel.json`** — Cron schedule `0 2 * * *` (daily 02:00 UTC).

#### Shop grid (mobile)
- **`app/shop/page.tsx`** — Product grid `grid-cols-2` on mobile, tighter card typography/buttons.

---

### Universal search (baseline)
- **`/search?q=`** — Dedicated results page (`app/search/page.tsx`, `app/search/SearchPageClient.tsx`): tabs for All / Products / Services / Stores, region and price filters, mobile filter bottom sheet, redesigned result cards; supports empty `q` (no redirect).
- **`GET /api/search`** — Unified search API (`app/api/search/route.ts`) calling `lib/search/run-search.ts` with `type`, `region`, `category`, price/rating filters, pagination, `preview` mode; always returns normalized `UniversalSearchResponse`.
- **`lib/search/`** — `types.ts` (+ empty/normalize helpers), `run-search.ts` (split product vs service queries via `isService`), `regions.ts`, `review-stats.ts`, `resolve-catalog-item.ts`.
- **`components/search/SearchDropdown.tsx`** — Nav typeahead: routes products vs services by `isService` / `type`, store cards, popular searches.
- **`components/layout/NavSearchInput.tsx`** — Desktop/mobile search UI; overlay on mobile; submits to `/search?q=`.
- **`lib/hooks/use-search.ts`** — Client fetch + short TTL cache; normalizes preview payloads.
- **`app/actions/search.ts`** — Popular search terms for empty state.

### Public store page redesign (`/store/[slug]`)
- **Hero** — `StorePageHero.tsx` + `StoreHeroActions.tsx`: 375px desktop / 220px mobile cover, gradient overlay, logo/meta/rating chip, follow/share/message (glass buttons), owner “Edit store”.
- **Stats bar** — `StoreStatsBar.tsx`: products, services, rating, verified status (owner KYC approved + store active).
- **Tabs** — `StorefrontTabs.tsx`: URL `?tab=about|store|services|reviews` (default about); **Bookings tab removed**; sticky tab bar; mobile filter bottom sheets for Store/Services tabs; desktop sticky filter sidebars.
- **About tab** — `StoreAboutTab.tsx`: masonry gallery + lightbox, “From this store” product/service rows with cart CTA, about copy, sidebar follow card (`StoreFollowCard`), opening hours, tags.
- **Reviews tab** — `StoreWriteReviewSection.tsx`: store-only reviews via `submitStoreReview` / `updateStoreReview`; `ReviewsList` below.
- **Actions** — `toggleFollowStore` in `app/actions/store.ts` (uses `SavedStore`); expanded `app/actions/reviews.ts` for store reviews + vendor notification.

### Layout & chrome
- **`PublicNav.tsx`** — Glass desktop nav (60px), `NavSearchInput` + preview dropdown, `MobileSearchOverlay`, mobile header + bottom tabs (Search → `/search`), account drawer (Tabler icons); `transparent` on `/store/[slug]` for hero overlay.
- **`SiteFooter.tsx`** — Dark footer, install strip, link columns, social icons.

### Vendor availability (`/dashboard/vendor/staff`)
- Route still under **`staff/`** but UI is **service availability** (`AvailabilityClient.tsx`): weekly hours, per-service schedules, `updateServiceAvailability` / toggle actions from `app/actions/services.ts` and `lib/services/` slot helpers.

### Finance & completion
- **`lib/finance/commission.ts`** — `getCommissionRate`, `calculateEarnings`, `ttdToMinor` / `minorToTtd` by plan (`STARTER` / `GROWTH` / `PRO`) and item type (product vs service).
- **`lib/finance/complete-booking.ts`**, **`complete-order.ts`**, **`release-earnings.ts`**, **`booking-payment.ts`** — Earnings release after completion; bookings use commission on release.
- **`GET /api/cron/auto-complete`** — `app/api/cron/auto-complete/route.ts`: releases earnings for bookings and `DELIVERED` split orders past `autoCompleteAt`; `x-cron-secret: CRON_SECRET`; scheduled in **`vercel.json`** at `0 2 * * *` (daily).

### Booking payments & completion
- **`app/actions/booking.ts`** — Stripe PaymentIntents for full/deposit booking pay; `confirmBookingPayment`; integrates `lib/finance/booking-payment.ts` on success (webhook + client retry).
- **`app/actions/bookings.ts`** — Customer `markBookingComplete` → `releaseBookingEarnings` via `lib/finance/complete-booking.ts`.

### Vendor dashboard routes
- **`lib/routes/vendor-dashboard.ts`** — Canonical paths: `VENDOR_VENDOR_ORDERS_PATH`, `VENDOR_VENDOR_FINANCE_PATH`, `VENDOR_VENDOR_MESSAGES_PATH`, `VENDOR_VENDOR_REVIEWS_PATH` (deprecated tab query aliases retained).

### PWA
- **`lib/hooks/use-pwa-install.ts`** — Global `beforeinstallprompt` capture (syncs with inline layout script), `appinstalled` / standalone detection, subscriber bumpers, `install()` promise API used by nav/footer/get-app.

### Regions & data hygiene
- **`lib/regions/region-canonical.ts`** + updates to **`tt-regions.ts`** / search region options — deduplicated Trinidad & Tobago region labels (fixes duplicate React keys).

### Other storefront fixes
- Product search API and shop flows set **`isService: false`** where appropriate; service rows tagged in universal search.
- Store page uses **`pb-mobile-public`** / tab content **`pb-[80px]`** for bottom nav clearance.

---

## Project Overview

LinkWe is a multi-vendor online marketplace for **Trinidad & Tobago**. It connects local shoppers with vendors (physical and digital products, bookable services, on-demand requests), couriers (pickup and delivery logistics), and platform admins. Customers browse a public storefront, use an AI shopping assistant, check out with Stripe, and track orders; vendors run a dashboard for catalog, orders, finance, bookings, and verification; couriers handle shipment workflows; admins moderate stores, products, listings, and users.

---

## Tech Stack

| Technology | Version (from `package.json`) | Role |
|------------|-------------------------------|------|
| **Next.js** | ^16.2.6 | App Router, RSC, Server Actions, API routes |
| **React** | ^19.2.6 | UI |
| **TypeScript** | ^5 (dev) | Typing |
| **Prisma** | ^5.22.0 | ORM |
| **PostgreSQL** | via `DATABASE_URL` | Database (local dev or hosted e.g. Supabase/Neon) |
| **Tailwind CSS** | ^4 | Styling (`@tailwindcss/postcss`) |
| **Stripe** | ^22.0.2 server, `@stripe/react-stripe-js` ^6.2.0, `@stripe/stripe-js` ^9.2.0 | Payments |
| **Anthropic SDK** | ^0.91.0 | Customer AI chat + vendor AI assistant |
| **Cloudinary** | ^2.9.0 | Image/file uploads |
| **Resend** | ^6.12.3 | Transactional email |
| **jose** | ^6.2.2 | JWT session cookies |
| **bcryptjs** | ^3.0.3 | Password hashing |
| **Zustand** | ^5.0.12 | Client cart UI state |
| **Sonner** | ^2.0.7 | Toasts |
| **@tabler/icons-react** | ^3.44.0 | Icons (nav, footer) |
| **lucide-react** | ^0.468.0 | Icons (dashboard, product UI) |
| **TipTap** | ^3.23.x | Rich text (vendor descriptions) |
| **Mapbox GL** / **react-map-gl** | ^3.22.0 / ^8.1.1 | Store maps |
| **@react-google-maps/api** | ^2.20.8 | Places (optional address) |
| **Leaflet** | ^1.9.4 | Maps (legacy/alternate) |
| **@react-pdf/renderer** | ^4.5.1 | PDF invoices |
| **Recharts** | ^3.8.1 | Vendor analytics charts |
| **ExcelJS** / **papaparse** / **csv-parse** | bulk import/export | |
| **canvas-confetti** | ^1.9.4 | Order confirmation UX |
| **qrcode** | ^1.5.4 | Order QR codes |
| **react-day-picker** | ^10.0.0 | Date picking |
| **react-markdown** | ^10.1.0 | Markdown rendering |
| **ESLint** | ^9 + `eslint-config-next` 16.2.3 | Lint |

**Note:** `next.config.ts` sets `typescript.ignoreBuildErrors: true` (builds may succeed with TS errors).

---

## Key File Paths

### Layout & public chrome
| Path | Purpose |
|------|---------|
| `components/layout/PublicNav.tsx` | Glass desktop nav (60px), centered `NavSearchInput`, shop/services/stores/events/AI links, notifications, cart, account drawer; mobile header + `MobileSearchOverlay`; bottom tabs (Search → `/search`); `transparent` on store pages |
| `components/layout/NavSearchInput.tsx` | Search field + `SearchDropdown` preview; mobile overlay; Enter / debounced navigation to `/search?q=` |
| `components/layout/SiteFooter.tsx` | Dark `#1C1C1A` footer: brand block, PWA install strip, 4-column links, social, legal row |
| `components/layout/FooterWrapper.tsx` | Hides footer on `/dashboard` and `/onboarding` |
| `components/layout/HeroSlider.tsx` | Homepage hero carousel |
| `app/layout.tsx` | Root layout: Sora font, PWA head script, SW registration, install prompt, cart provider, toaster, footer |
| `middleware.ts` | Protects `/dashboard/*`, `/onboarding/*`, `/vendor/*`; sets `x-pathname` header |

### Auth
| Path | Purpose |
|------|---------|
| `app/(auth)/login/page.tsx` | Login form |
| `app/(auth)/register/page.tsx` | Signup hub |
| `app/(auth)/register/customer/page.tsx` | Customer registration |
| `app/(auth)/register/courier/page.tsx` | Courier registration |
| `app/register/business/page.tsx` | Business/vendor signup entry |
| `app/(auth)/forgot-password/page.tsx` | Password reset request |
| `app/(auth)/reset-password/page.tsx` | Reset password with token |
| `app/(auth)/auth-actions.ts` | Server actions: register, login, logout (rate-limited register) |
| `app/(auth)/layout.tsx` | Centered auth shell |
| `lib/auth/session.ts` | `getSession`, `createSession`, `destroySession` (cookies + JWT) |
| `lib/auth/token.ts` | Sign/verify session JWT (`AUTH_SECRET`), cookie options |
| `lib/auth/password.ts` | bcrypt hash/verify |
| `lib/auth/current-user.ts` | Load full user for dashboards |
| `lib/auth/landing.ts` | Post-login redirect (onboarding vs dashboard) |
| `lib/auth/redirects.ts` | Role → dashboard path, safe internal redirects |
| `lib/auth/signup-kinds.ts` | CUSTOMER / BUSINESS / COURIER signup mapping |
| `lib/auth/assert-role.ts` | Dashboard role guards |

### Vendor dashboard
| Path | Purpose |
|------|---------|
| `components/vendor/vendor-dashboard-shell.tsx` | Sidebar + topbar layout wrapper |
| `components/vendor/vendor-dashboard-sidebar.tsx` | Vendor nav links + badges |
| `components/vendor/vendor-dashboard-topbar.tsx` | Top bar (store context) |
| `components/vendor/vendor-mobile-bottom-nav.tsx` | Mobile vendor tabs; **More** → bottom sheet menu (not direct `/settings`) |
| `components/vendor/VendorDashboardOverview.tsx` | Overview metrics/cards |
| `app/(dashboard)/dashboard/vendor/layout.tsx` | Vendor auth, business onboarding gate, shell props |
| `app/(dashboard)/dashboard/vendor/page.tsx` | Main vendor hub (tabs: store, products, listings, etc.) |
| `app/(dashboard)/dashboard/vendor/components/vendor-dashboard-tabs.tsx` | Tab UI composition |

### Customer-facing storefront
| Path | Purpose |
|------|---------|
| `app/page.tsx` | Homepage (featured products, services, stores) |
| `app/shop/page.tsx` | Product catalog + filters |
| `app/products/[slug]/page.tsx` | Product PDP: `w-full px-8`, grid `1fr 1.2fr 360px`, `ProductCollapsibleTags`, FBT in info column, `ProductBuyBox` + `mobileStickyBar` |
| `app/services/page.tsx` | Services browse |
| `app/service/[slug]/page.tsx` | Service detail + booking/on-demand widgets |
| `app/(storefront)/stores/page.tsx` | Store directory |
| `app/(storefront)/stores/[slug]/page.tsx` | Storefront listing (alternate route) |
| `app/store/[slug]/page.tsx` | Public store page: hero, stats bar, `StorefrontTabs` (server data: products, services, reviews, follow state) |
| `app/search/page.tsx` | Universal search results; `q` optional (empty state + popular terms) |
| `app/search/SearchPageClient.tsx` | Client search: debounced header query → URL, filters, tabs, safe `resultTotal`, normalized API data |
| `app/cart/page.tsx` | Cart review |
| `app/checkout/page.tsx` + `app/checkout/checkout-client.tsx` | Checkout + Stripe Elements |
| `app/order-confirmation/[orderId]/page.tsx` | Post-checkout celebration |
| `app/orders/page.tsx` | Customer order list |
| `app/orders/[orderId]/page.tsx` | Order detail |
| `app/wishlist/page.tsx` | Wishlist |
| `app/saved-stores/page.tsx` | Saved stores |
| `app/my-requests/page.tsx` | On-demand service requests |
| `app/bookings/page.tsx` | Customer bookings |
| `app/booking-confirmation/page.tsx` | Booking confirmation |
| `app/chat/page.tsx` | AI shopping chat UI |
| `app/get-app/page.tsx` + `app/get-app/GetAppClient.tsx` | PWA install marketing page |
| `app/listing/[slug]/page.tsx` | Legacy/generic listing detail |
| `app/events/page.tsx` | Events browse |
| `components/storefront/StorefrontTabs.tsx` | URL-driven tabs: About, Store, Services, Reviews (no Bookings) |
| `components/storefront/StoreAboutTab.tsx` | About tab layout: gallery, listings preview, hours, tags |
| `components/storefront/StorePageHero.tsx` | Full-width cover hero + identity overlay |
| `components/storefront/StoreStatsBar.tsx` | Product/service/rating/verified stats row |
| `components/storefront/StoreHeroActions.tsx` | Follow, share, message, edit-store actions |
| `components/storefront/StoreFollowCard.tsx` | Dark sidebar follow CTA (`toggleFollowStore`) |
| `components/storefront/StoreWriteReviewSection.tsx` | Store review form / edit / sign-in prompt |
| `components/storefront/StoreProductFiltersPanel.tsx` | Store tab filter panel (desktop + sheet) |
| `components/storefront/StoreServiceFiltersPanel.tsx` | Services tab filters (type, price, sort) |
| `components/storefront/StoreMobileFilterSheet.tsx` | Mobile bottom sheet wrapper for tab filters |
| `components/storefront/StoreCompactCartButton.tsx` | Inline cart add on About tab product rows |
| `components/search/SearchDropdown.tsx` | Nav search preview dropdown |

### Admin dashboard
| Path | Purpose |
|------|---------|
| `app/(dashboard)/dashboard/admin/layout.tsx` | ADMIN role gate |
| `app/(dashboard)/dashboard/admin/page.tsx` | Admin home/metrics |
| `app/(dashboard)/dashboard/admin/stores/page.tsx` | Store moderation |
| `app/(dashboard)/dashboard/admin/products/page.tsx` | Product moderation |
| `app/(dashboard)/dashboard/admin/listings/page.tsx` | Listing moderation |
| `app/(dashboard)/dashboard/admin/verification/page.tsx` | ID verification queue |
| `app/(dashboard)/dashboard/admin/users/page.tsx` | User management — search, role filters, suspend, delete |
| `app/(dashboard)/dashboard/admin/users/admin-users-client.tsx` | Interactive table with checkboxes, bulk actions, row click to open panel |
| `app/(dashboard)/dashboard/admin/users/admin-user-detail.tsx` | Slide-over detail panel with role-specific stats |
| `app/(dashboard)/dashboard/admin/settings/page.tsx` | Admin settings (e.g. password manager) |

### Courier dashboard
| Path | Purpose |
|------|---------|
| `app/(dashboard)/dashboard/courier/layout.tsx` | Courier nav + `CourierRouteGuard` |
| `app/(dashboard)/dashboard/courier/page.tsx` | Courier dashboard |
| `app/(dashboard)/dashboard/courier/onboarding/page.tsx` | Courier onboarding |
| `app/(dashboard)/dashboard/courier/jobs/[shipmentId]/page.tsx` | Shipment job detail |
| `app/(dashboard)/dashboard/courier/bank/page.tsx` | Courier bank details |

### Server actions (`app/actions/`)
All use `"use server"` pattern; mutations return `{ success }` / `{ error }` or domain-specific shapes; many call `revalidatePath` after writes.

| File | Domain |
|------|--------|
| `admin-bays.ts` | Warehouse dock bays |
| `admin-couriers.ts` | Courier admin ops |
| `admin-customers.ts` | Customer admin |
| `admin-users.ts` | User management: `getAdminUsers` (paginated, search, role filter, includes store data), `getAdminUserDetail` (role-specific stats: vendor earnings/orders/bookings/reviews, customer spend/bookings, courier info), `suspendUser`, `unsuspendUser`, `deleteUser`, `bulkSuspendUsers`, `bulkDeleteUsers` |
| `admin-delete.ts` | Admin deletions |
| `admin-listings.ts` | Listing moderation |
| `admin-map.ts` | Admin map data |
| `admin-metrics.ts` | Dashboard metrics |
| `admin-orders.ts` | Order admin |
| `admin-products-helpers.ts` | Product admin helpers |
| `admin-products.ts` | Product moderation |
| `admin-stores.ts` | Store moderation |
| `admin-vendors.ts` | Vendor admin |
| `admin-warehouse.ts` | Warehouse admin |
| `ai-bulk-upload.ts` | AI-assisted bulk product upload |
| `ai-vendor-image.ts` | Vendor AI image handling |
| `ai-vendor-store.ts` | Vendor AI store context |
| `ai-vendor-update.ts` | Vendor AI catalog updates |
| `ai-vendor.ts` | Vendor AI assistant actions |
| `assembly.ts` | Order assembly/bundling |
| `availability.ts` | Service/product availability |
| `booking.ts` | Bookings: slots, create/cancel, Stripe PaymentIntent pay (full/deposit), `confirmBookingPayment` |
| `bookings.ts` | Customer marks booking complete; releases vendor earnings |
| `cart.ts` | Listing-based cart (legacy path) |
| `checkout.ts` | Stripe PaymentIntent, order creation, emails, notifications |
| `courier-bank.ts` | Courier payout bank info |
| `courier-location.ts` | Live courier location |
| `courier-ops.ts` | Courier operational actions |
| `courier-payout.ts` | Courier payouts |
| `courier-profile.ts` | Courier profile |
| `courier.ts` | Courier shipments/jobs |
| `digital-upload.ts` | Digital product file delivery |
| `fulfillment.ts` | Split orders, vendor fulfillment choices |
| `notifications.ts` | In-app notifications CRUD |
| `on-demand.ts` | On-demand service requests + Stripe for quotes |
| `order-received.ts` | Customer mark order received |
| `password-reset.ts` | Forgot/reset password emails |
| `product-bulk.ts` | Bulk product CSV/Excel |
| `product-variants.ts` | Product variants |
| `product.ts` | Product CRUD (vendor catalog) |
| `public-stores.ts` | Public store data/actions |
| `reviews.ts` | Product/service/store reviews: `submitProductReview`, `submitStoreReview`, `updateStoreReview`, `getStoreReviewsNew`, `getUserStoreReview` |
| `store.ts` | Store profile/settings + `toggleFollowStore` (SavedStore) |
| `search.ts` | Popular search terms for search UI |
| `searchProducts.ts` | Product search (AI + shop) |
| `services.ts` | Service catalog + vendor availability (`getVendorAvailabilityPageData`, `updateServiceAvailability`) |
| `settings.ts` | User profile/password settings |
| `staff.ts` | Staff members for bookable services (legacy; availability UI on `/dashboard/vendor/staff`) |
| `vendor-reviews.ts` | Vendor review inbox + replies |
| `vendor-verification.ts` | KYC / verification uploads |
| `vendor-chat.ts` | Vendor↔customer messaging |
| `vendor.ts` | Vendor finance, bank, payouts, store ops |
| `warehouse.ts` | Warehouse receiving lines |
| `wishlist.ts` | Wishlist add/remove |

### API routes (`app/api/`)
| Route | Purpose |
|-------|---------|
| `POST /api/chat` | Streaming Anthropic chat for shoppers; tools: product search, `add_to_cart` |
| `POST /api/vendor-ai` | Vendor listing/product AI assistant (large route) |
| `GET /api/search` | Universal search (`q`, `type`, `region`, `category`, price, `rating`, `page`, `preview`); `emptyUniversalSearchResponse` when `q` &lt; 2 or on error |
| `GET/POST /api/products/search` | Product-only search (shop/typeahead; `isService: false`) |
| `GET/POST /api/stores/search` | Store search API |
| `GET /api/cron/auto-complete` | Cron: auto-complete bookings + delivered orders (`x-cron-secret: CRON_SECRET`) |
| `POST /api/booking-checkout` | Booking payment checkout (legacy/alternate path) |
| `POST /api/contact` | Contact form submission |
| `GET /api/invoice/[orderId]` | Customer order invoice PDF/stream |
| `GET /api/vendor-invoice/[splitOrderId]` | Vendor split-order invoice |
| `POST /api/webhooks/stripe` | Stripe webhooks: `payment_intent.succeeded` → PAID + split orders; on-demand checkout sessions |

### Data & config
| Path | Purpose |
|------|---------|
| `prisma/schema.prisma` | Full database schema |
| `lib/prisma.ts` | Prisma client singleton |
| `.env.example` | Documented env template (partial) |
| `.env` / `.env.local` | Local secrets (not committed; may exist locally) |
| `app/globals.css` | CSS variables, brand tokens, mobile tab padding, Tiptap prose |
| `lib/design-system.ts` | TS design tokens (colors, typography, spacing) for storefront pages |
| `public/manifest.json` | PWA manifest |
| `public/sw.js` | Custom service worker (cache + offline fallback) |
| `lib/hooks/use-pwa-install.ts` | PWA install: global deferred prompt, `isInstallable` / `isInstalled`, `install()` |
| `lib/hooks/use-search.ts` | Client universal search fetch + in-memory cache |
| `lib/search/run-search.ts` | Server universal search orchestration |
| `lib/search/types.ts` | Search result types; `emptyUniversalSearchResponse`, `normalizeUniversalSearchResponse` |
| `lib/search/resolve-catalog-item.ts` | Classify/repair mis-tagged product vs service rows |
| `lib/vendor/vendor-split-order-query.ts` | Production-safe Prisma `select` for vendor split-order list/detail (schema lag) |
| `lib/vendor/vendor-service-query.ts` | Production-safe service list/detail/availability queries + availability fallback |
| `lib/finance/commission.ts` | Vendor commission rates by plan + item type; earnings breakdown helpers |
| `scripts/neon-product-availability-columns.sql` | Idempotent Neon SQL for Product availability columns |
| `vercel.json` | Vercel cron: `/api/cron/auto-complete` daily `0 2 * * *` |
| `lib/finance/complete-booking.ts` | Release booking earnings after complete/auto-complete |
| `lib/finance/complete-order.ts` | Release split-order earnings after delivery auto-complete |
| `lib/finance/booking-payment.ts` | Stripe PI success handler for bookings |
| `lib/routes/vendor-dashboard.ts` | Canonical vendor sub-route path constants |
| `lib/regions/region-canonical.ts` | Canonical T&T region slug/label deduplication |

### Layouts by route group
| Path | Purpose |
|------|---------|
| `app/layout.tsx` | Root (all routes) |
| `app/(auth)/layout.tsx` | Auth pages |
| `app/(dashboard)/layout.tsx` | Dashboard segment wrapper |
| `app/(dashboard)/dashboard/layout.tsx` | Requires login; redirects incomplete onboarding |
| `app/(dashboard)/dashboard/vendor/layout.tsx` | Vendor shell + onboarding |
| `app/(dashboard)/dashboard/admin/layout.tsx` | Admin role check |
| `app/(dashboard)/dashboard/courier/layout.tsx` | Courier layout + guard |
| `app/(dashboard)/dashboard/vendor/ai-assistant/layout.tsx` | AI assistant full-height layout |
| `app/(app)/onboarding/layout.tsx` | Onboarding wrapper |
| `app/(app)/onboarding/business/layout.tsx` | Business onboarding steps |
| `app/vendor/layout.tsx` | `/vendor/store/setup` segment |

---

## Routes

### Public (storefront & marketing)
No middleware auth required (individual pages may require login for actions).

| Route | Page |
|-------|------|
| `/` | Home |
| `/shop` | Product shop (query: category, region, q, filters) |
| `/products/[slug]` | Product detail |
| `/services` | Services index |
| `/service/[slug]` | Service detail |
| `/stores` | All stores |
| `/stores/[slug]` | Store (storefront group) |
| `/store/[slug]` | Store profile (`?tab=about\|store\|services\|reviews`) |
| `/search` | Universal search results (`?q=` optional; min 2 chars to fetch) |
| `/events` | Events |
| `/listing/[slug]` | Listing detail |
| `/chat` | AI shopping assistant |
| `/cart` | Shopping cart |
| `/checkout` | Checkout (login required to pay) |
| `/order-confirmation/[orderId]` | Order success |
| `/orders` | My orders (login) |
| `/orders/[orderId]` | Order detail |
| `/bookings` | My bookings |
| `/booking-confirmation` | Booking confirmed |
| `/wishlist` | Wishlist |
| `/saved-stores` | Saved stores |
| `/my-requests` | On-demand requests |
| `/get-app` | Install PWA |
| `/contact` | Contact |
| `/privacy` | Privacy policy |
| `/terms` | Terms |
| `/offline` | Offline fallback (PWA) |

### Auth (public forms)
| Route | Page |
|-------|------|
| `/login` | Login |
| `/register` | Register hub |
| `/register/customer` | Customer signup |
| `/register/courier` | Courier signup |
| `/register/business` | Business signup |
| `/forgot-password` | Forgot password |
| `/reset-password` | Reset password |

### Onboarding (middleware-protected)
| Route | Page |
|-------|------|
| `/onboarding/customer` | Customer onboarding |
| `/onboarding/vendor` | Vendor onboarding |
| `/onboarding/courier` | Courier onboarding |
| `/onboarding/business/step-1` | Business step 1 |
| `/onboarding/business/step-2` | Business step 2 |
| `/onboarding/business/step-3` | Business step 3 |

### Vendor setup (middleware: `/vendor/*`)
| Route | Page |
|-------|------|
| `/vendor/store/setup` | Initial store setup |

### Customer dashboard (`/dashboard/*`, role CUSTOMER)
| Route | Page |
|-------|------|
| `/dashboard` | Role hub / redirect helper |
| `/dashboard/customer` | Customer dashboard |
| `/dashboard/customer/settings` | Customer settings |

### Vendor dashboard (role VENDOR)
| Route | Page |
|-------|------|
| `/dashboard/vendor` | Main tabs (store, products, listings, orders inline, etc.) |
| `/dashboard/vendor/orders` | Orders list |
| `/dashboard/vendor/orders/[splitOrderId]` | Split order fulfillment |
| `/dashboard/vendor/products` | Products |
| `/dashboard/vendor/products/new` | New product |
| `/dashboard/vendor/products/[id]/edit` | Edit product |
| `/dashboard/vendor/services` | Services |
| `/dashboard/vendor/services/new` | New service |
| `/dashboard/vendor/services/[id]/edit` | Edit service |
| `/dashboard/vendor/services/[id]/availability` | Availability editor |
| `/dashboard/vendor/listings/new` | New listing |
| `/dashboard/vendor/listings/[listingId]/edit` | Edit listing |
| `/dashboard/vendor/store/edit` | Store profile editor |
| `/dashboard/vendor/finance` | Ledger & payouts |
| `/dashboard/vendor/messages` | Vendor messages |
| `/dashboard/vendor/reviews` | Reviews |
| `/dashboard/vendor/requests` | On-demand requests |
| `/dashboard/vendor/bookings` | Bookings calendar |
| `/dashboard/vendor/staff` | Service availability (`AvailabilityClient`; `getVendorAvailabilityPageData`; weekly hours + per-service rules) |
| `/dashboard/vendor/ai-assistant` | AI listing assistant |
| `/dashboard/vendor/settings` | Vendor settings |

### Courier dashboard (role COURIER)
| Route | Page |
|-------|------|
| `/dashboard/courier` | Courier home |
| `/dashboard/courier/onboarding` | Courier onboarding |
| `/dashboard/courier/bank` | Bank details |
| `/dashboard/courier/jobs/[shipmentId]` | Job detail |

### Admin dashboard (role ADMIN)
| Route | Page |
|-------|------|
| `/dashboard/admin` | Admin overview |
| `/dashboard/admin/stores` | Stores |
| `/dashboard/admin/products` | Products |
| `/dashboard/admin/listings` | Listings |
| `/dashboard/admin/verification` | ID verification |
| `/dashboard/admin/users` | User management |
| `/dashboard/admin/settings` | Admin settings |

### API (see table above)
All under `app/api/.../route.ts`.

---

## Database Models

Summaries from `prisma/schema.prisma` (PostgreSQL). Many enums exist for order/shipment/listing status — see schema for full enums.

| Model | Summary |
|-------|---------|
| **User** | Account: email, password, role (CUSTOMER/VENDOR/COURIER/ADMIN), region, KYC fields, courier onboarding, bank fields |
| **VendorBankDetails** | Vendor payout bank account (separate table) |
| **CourierBankDetails** | Courier payout bank account |
| **CourierLedgerEntry** | Courier earnings ledger lines |
| **CourierPayoutRequest** | Courier payout requests |
| **CourierLocation** | Courier GPS snapshot for dispatch |
| **Store** | Vendor storefront: slug, region, media, hours, staff mode, geo, status, onboarding step |
| **StoreImage** | Store gallery images |
| **VendorThreshold** | Minimum payout threshold per store |
| **VendorLedgerEntry** | Vendor earnings/debits tied to orders/payouts |
| **Address** | User/shipping addresses |
| **Listing** | Unified listing catalog (PRODUCT, EVENT, etc.) with price in minor units |
| **ListingProduct** | PRODUCT listing subtype (SIMPLE/VARIANT/DIGITAL/…) |
| **ListingProductVariant** | Listing variants + warehouse inventory link |
| **ListingRealEstate** | Real-estate listing extension |
| **ListingVehicle** | Vehicle listing extension |
| **ListingEvent** | Event listing extension |
| **ListingService** | Service listing extension |
| **ListingRestaurant** | Restaurant listing extension |
| **ListingPlace** | Place listing extension |
| **ListingTicket** | Ticket listing extension |
| **ListingDigital** | Digital goods listing extension |
| **ListingBookable** | Bookable listing extension |
| **Warehouse** | Fulfillment warehouse |
| **WarehouseInventory** | Stock per variant per warehouse |
| **Cart** | Legacy listing-based cart (ACTIVE status) |
| **CartItem** | Line items referencing Listing + optional variant |
| **MainOrder** | Customer checkout order: totals, shipping zone, status, reference |
| **OrderItem** | Checkout line snapshots (product or listing, store, price, weight) |
| **ShippingBundle** | Groups split orders for outbound shipping from warehouse |
| **SplitOrder** | Per-vendor fulfillment unit with status machine + pickup/dropoff fields |
| **DockBay** | Physical bay assignment for split orders |
| **SplitOrderItem** | Line items on a split order |
| **WarehouseOrderLine** | Warehouse check-in lines per split item |
| **Shipment** | Courier shipment (inbound/outbound), tracking, proof |
| **OrderDocument** | Generated docs (invoices, etc.) |
| **PayoutRequest** | Vendor payout withdrawal requests |
| **Review** | Product/store/listing/booking reviews + vendor reply |
| **Notification** | In-app notification rows per user |
| **RateLimit** | DB-backed rate limit buckets |
| **AIChatSession** | Customer or vendor AI chat sessions |
| **AIMessage** | Messages in AI sessions |
| **Product** | Primary vendor catalog entity (rich flags: digital, bookable, service, on-demand) |
| **ProductCartItem** | **Checkout cart** lines (used by `checkout.ts`) |
| **ProductVariant** | Product SKU variants with JSON attributes |
| **ProductAvailabilitySchedule** | Weekly bookable slots |
| **ProductAvailabilityOverride** | Date overrides for availability |
| **ProductBookingSlot** | Concrete bookable slot instances |
| **ProductBooking** | Customer booking records |
| **Wishlist** / **WishlistItem** | Saved products |
| **SavedStore** | Saved vendor stores |
| **OnDemandRequest** | On-demand service quote/request workflow |
| **DigitalDownload** | Digital purchase download tracking |
| **RealEstate** | Standalone real-estate content on store |
| **Vehicle** | Vehicle listings on store |
| **Event** / **EventTicketType** | Event pages + ticket types |
| **Place** | Place/venue content |
| **FoodOutlet** | Food outlet content |
| **Accommodation** | Accommodation listings |
| **Service** | Standalone service entity (parallel to bookable Product) |
| **StoreContentRelationship** | Cross-store content linking |
| **VendorChat** / **VendorChatMessage** | Vendor messaging threads |
| **StaffMember** / **StaffAvailability** / **StaffService** | Multi-staff booking |

---

## Brand & Design Tokens

### `app/globals.css` (`:root`)
| Token | Value |
|-------|-------|
| `--mobile-tab-offset` | `calc(3.5rem + env(safe-area-inset-bottom))` |
| `--brand-red` / `--scarlet` | `#D4450A` |
| `--scarlet-hover` | `#B83A09` |
| `--scarlet-light` | `#D4450A1A` |
| `--scarlet-muted` | `#D4450A33` |
| `--brand-amber` / `--amber` | `#E8820C` |
| `--brand-blue` / `--blue` | `#1A7FB5` |
| `--brand-wood` | `#8B5E3C` |
| `--background` / `--surface` | `#F5F5F5` (dark mode override: `#0a0a0a`) |
| `--foreground` | `#171717` (dark: `#ededed`) |
| `--dark` | `#1C1C1A` |
| `--text-primary` | `#1C1C1A` |
| `--text-secondary` | `#45443f` |
| `--text-muted` | `#7c7b77` |
| `--text-faint` | `#A09F9B` |
| `--text-disabled` | `#C4C3C0` |
| `--card-border` | `rgba(28, 28, 26, 0.08)` |
| `--color-border-tertiary` | `rgba(28, 28, 26, 0.12)` |
| `--color-background-secondary` | `#f7f7f2` (store About tab cards) |
| `--color-text-secondary` | alias → `#45443f` |
| `--success-bg` / `--success-text` | `#dcfce7` / `#15803d` |
| `--font-display` | `var(--font-sora), sans-serif` |

### `lib/design-system.ts`
Exports `colors` (scarlet `#D4450A`, amber, blue, dark `#1C1C1A`, page `#F5F5F5`, semantic success/danger/warning), `typography` (Sora-based scale), `spacing`, `radius`, `shadow`, Tailwind class bundles in `tw`.

### Typography
- **Font:** Sora via `next/font/google` in `app/layout.tsx` (`--font-sora`), applied on `body` and Tailwind `font-sans`.

### Public nav/footer accents
- Nav/footer use `#1C1C1A` backgrounds, scarlet `#D4450A` CTAs, amber `#E8820C` role pills in drawer.

---

## Environment Variables

From `.env.example` plus variables referenced in code (set locally; **never commit values**).

| Variable | Used for |
|----------|----------|
| `NEXT_PUBLIC_BASE_URL` | App URL (emails, QR, redirects) |
| `NEXT_PUBLIC_APP_URL` | Alternate base URL fallback |
| `DATABASE_URL` | PostgreSQL connection |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js on checkout |
| `STRIPE_SECRET_KEY` | Server Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary uploads |
| `CLOUDINARY_API_KEY` | Cloudinary |
| `CLOUDINARY_API_SECRET` | Cloudinary |
| `AUTH_SECRET` | JWT session signing (**required**, not in `.env.example`) |
| `RESEND_API_KEY` | Resend email (**not in `.env.example`)** |
| `RESEND_FROM_EMAIL` | From address |
| `ANTHROPIC_API_KEY` | Claude APIs (**not in `.env.example`)** |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox maps (**not in `.env.example`)** |
| `NEXT_PUBLIC_GOOGLE_PLACES_KEY` | Google Places autocomplete (optional) |
| `NODE_ENV` | development vs production behavior |
| `CRON_SECRET` | Authorizes `GET /api/cron/auto-complete` (`x-cron-secret` header) |

---

## Shared Components (`components/`)

Grouped by folder; one line each.

### `cart/`
- **CartProvider** — Wraps app with cart drawer + Zustand hydration.
- **CartDrawer** — Slide-out cart UI.
- **CartRemoveButton** — Remove line from cart.
- **CartRecommendationsRow** — Upsell row in cart.

### `chat/`
- **ShoppingChat** — Customer AI chat UI (streams from `/api/chat`).

### `home/`
- **HomeFeaturedStoreCard** — Featured store card on homepage.

### `icons/`
- **amenity-lucide** — Amenity icon mapping.
- **service-type-lucide** — Service type icons.

### `layout/`
- **PublicNav** — Public navigation (see above).
- **SiteFooter** — Site footer.
- **FooterWrapper** — Conditional footer visibility.
- **HeroSlider** — Homepage hero.

### `listing-main-image.tsx**
- **ListingMainImage** — Listing/product thumbnail with fallback.

### `orders/`
- **InvoiceDocument** — Customer PDF invoice layout.
- **VendorInvoiceDocument** — Vendor split-order invoice PDF.

### `product/`
- **AddToCartButton** — PDP add-to-cart with variants.
- **ProductBuyBox** — Price, stock, variants, qty, wishlist, trust, sold-by; optional **`mobileStickyBar`** fixed bottom CTA on `<md`.
- **ProductGallery** — Main image + zoom; mobile 60px scroll thumbnails / desktop 80px wrap.
- **ProductCollapsibleTags** — Collapsible tag pills (5 desktop / 3 mobile default).
- **ProductReviewsSection** — Reviews list + form hook-in.
- **ProductTrustSignals** — Trust badges on PDP.
- **FrequentlyBoughtTogether** — Amazon-style bundle row (current product + same-store picks, checkboxes, add-all).
- **VariantSelector** — Variant picker.

### `providers/`
- **LinkWeToaster** — Sonner toast host.

### `pwa/`
- **InstallPrompt** — Delayed PWA install banner.
- **ServiceWorkerRegistration** — Registers `/sw.js`.

### `service/`
- **BookingWidget** — Bookable service calendar flow.
- **OnDemandRequestWidget** — On-demand quote request UI.
- **ServiceGallery** — Service images.

### `settings/`
- **ProfileForm** — Name/phone/region settings.
- **PasswordForm** — Change password.

### `shop/`
- **ProductSearchBar** — Shop search input.
- **ShopFilters** — Filter sidebar/sheets.
- **ShopProductCardActions** — Wishlist + quick actions on cards.
- **AddToCartButtonSimple** — Grid card add-to-cart.
- **ProductCardChooseOptionsLink** — Link when variants required.

### `storefront/`
- **StorefrontTabs** — Store page tabbed content.
- **StorefrontMapAndProducts** — Map + product grid.
- **StoreLocationPicker** — Address/geo picker (Mapbox/Google).
- **StoreFiltersDrawer** — Mobile store filters.
- **StoreSearchBar** — Store search.
- **PublicStoreCard** — Store directory card.

### `ui/`
- **Button**, **Input**, **Textarea**, **Select**, **Label**, **Card**, **Badge** — Form primitives.
- **CategoryPicker** — Visual emoji grid category selector (`grid-cols-3`, 27 categories, 6 groups, scarlet selected state); used in vendor onboarding step 3 and store edit page; props: `name`, `value`, `onChange?`.
- **empty-state** — Empty state illustration block.
- **NotificationBell** — In-app notifications dropdown.
- **WishlistButton** — Toggle wishlist heart.
- **SaveStoreButton** — Save/unsave store.
- **StarRating**, **ReviewForm**, **ReviewsList** — Reviews UI.
- **RichTextEditor** — TipTap editor.
- **content-skeletons**, **skeleton** — Loading placeholders.
- **InlineSpinner** — Small spinner.
- **StatCard** — Metric card.
- **RegionSelect** — T&T region dropdown.
- **ExpandableDescription** — Collapsible long text.
- **pwa-installed-toast** — PWA install success toast body.

### `vendor/`
- **vendor-dashboard-shell** — Vendor layout chrome.
- **vendor-dashboard-sidebar** — Sidebar navigation.
- **vendor-dashboard-topbar** — Top bar.
- **vendor-mobile-bottom-nav** — Mobile vendor tabs; More → bottom sheet with secondary routes + sign out.
- **VendorDashboardOverview** — Overview widgets.
- **VendorVerificationChecklist** — KYC checklist on dashboard.
- **ProductVariantEditor** — Variant matrix editor.
- **draggable-image-grid** — Reorder product images.
- **OpeningHoursEditor** — Store hours JSON editor.
- **AvailabilityToggle** — “Available now” toggle.
- **floating-ai-chat** — Floating vendor AI entry.
- **VendorVerificationChecklist** — ID verification progress.

### `services/` (top-level)
- **ServicesLaunchNotifyModal** — “Notify me” mailto modal for services launch.

---

## Current State — What Is Built

### Auth flows
- Email/password register (customer, business→vendor, courier) with rate limiting.
- Login/logout via JWT in httpOnly cookie (`jose`).
- Forgot/reset password (`password-reset` actions).
- Middleware guards dashboard/onboarding/vendor paths.
- Role-based redirects and business onboarding gating for vendors.

### Onboarding flows
- Customer, vendor, courier onboarding pages under `/onboarding/*`.
- Multi-step business onboarding (`/onboarding/business/step-1..3`) required before vendor dashboard.
- Courier onboarding step tracked on `User.courierOnboardingStep`.
- Vendor store setup at `/vendor/store/setup`.

### Vendor features
- Store profile editor (hours, location, amenities, social).
- Product CRUD with variants, images (Cloudinary), bulk upload, digital flags.
- Service CRUD with booking/on-demand/subscription/quote modes.
- Listings CRUD (parallel listing system).
- Split-order fulfillment UI, inbound method, courier pickup.
- Finance tab: ledger, bank details, payout requests; commission by `VendorSubscriptionPlan` via `lib/finance/commission.ts`.
- **Availability** page at `/dashboard/vendor/staff` (service booking windows; replaces legacy staff-only scheduling UI).
- Bookings inbox + Stripe pay flow for online/deposit booking payments.
- On-demand request inbox (quote/accept/decline).
- Reviews inbox with vendor replies.
- Vendor AI assistant + API.
- Verification checklist (ID upload).
- Vendor messaging (`vendor-chat`).

### Customer features
- Shop with filters/search; product PDP with variants, wishlist, reviews.
- **Universal search** at `/search` (optional `q`) and nav dropdown preview (`/api/search`); in-page debounced search on results page.
- Services browse; service pages with booking and on-demand widgets.
- Store directory and **redesigned store pages** (hero, stats, About/Store/Services/Reviews tabs, follow store, write store review).
- Cart + Stripe checkout (`ProductCartItem`); order confirmation and order history.
- AI shopping chat with product search and add-to-cart tool.
- Wishlist, saved stores, bookings list, on-demand “my requests”.
- In-app notifications bell.

### Admin features
- Store/product/listing moderation UIs.
- ID verification queue.
- Admin metrics/overview.
- Admin password manager (settings).
- Warehouse/bays/courier admin actions (server actions exist).
- **User management** at `/dashboard/admin/users` — full user table (search, role filters, pagination), clickable rows open a slide-over panel with role-specific stats, bulk suspend/delete with skip logic, suspend/unsuspend per-user.

### Payment flow
- Checkout creates `MainOrder` + Stripe PaymentIntent (TTD minor units).
- Webhook marks order PAID and runs `createSplitOrdersFromMainOrder`.
- On-demand flows can use Stripe Checkout sessions (webhook updates request status).
- **Bookings:** `app/actions/booking.ts` creates Stripe PaymentIntents (full or deposit); success handled in `lib/finance/booking-payment.ts`.
- **Vendor earnings:** Held until completion; released with commission deducted (`release-earnings`, `complete-booking`, `complete-order`); cron auto-complete when `autoCompleteAt` elapses.

### Notifications
- `createNotification` in server actions (orders, bookings, reviews, payouts, on-demand).
- `NotificationBell` polls/loads via `getNotifications`, mark read actions.
- Email via Resend templates on order events.

### AI features
- **Customer:** `/chat` + `/api/chat` — Claude Sonnet, product search tool, `add_to_cart` tool.
- **Vendor:** `/dashboard/vendor/ai-assistant` + `/api/vendor-ai` + `app/actions/ai-vendor*.ts` — catalog/listing assistance, image analysis, bulk upload helpers.

### Fulfillment & courier (partial/full)
- Split order status machine, warehouse lines, shipments, dock bays.
- Courier dashboard for jobs, location updates, bank/payout ledger.
- Assembly/bundling actions for warehouse ops.

### PWA
- Manifest, custom SW, install prompt, get-app page, early `beforeinstallprompt` capture in root layout.

---

## Known Gaps & Issues

| Area | Notes |
|------|--------|
| **Dual catalog models** | `Listing`/`Cart`/`CartItem` coexist with `Product`/`ProductCartItem`; checkout uses **Product** cart; some code paths still reference listings. |
| **Currency** | Many Prisma defaults use `USD` char(3); UI displays **TTD** — verify consistency. |
| **`.env.example` incomplete** | Missing `AUTH_SECRET`, `ANTHROPIC_API_KEY`, `RESEND_*`, Mapbox, Google keys though code expects them. |
| **TypeScript build** | `ignoreBuildErrors: true` may hide type errors. |
| **Generic `/dashboard` hub** | `ROLE_CARDS` copy still says features “will live here” for some roles. |
| **Services notify** | `ServicesLaunchNotifyModal` uses `mailto:` — no waitlist API. |
| **Footer/legal** | “Cookie policy” links to `/privacy`; About/Careers → `/contact`; social URLs may be marketing placeholders. |
| **Legacy uploads** | `lib/listing/local-listing-upload.ts` supports old `/uploads/listings` local files alongside Cloudinary. |
| **Broad schema, selective UI** | Models for RealEstate, Vehicle, Place, FoodOutlet, Accommodation — not yet exposed on main storefront nav. Events are live. |
| **Events — Stripe not wired** | `TicketPurchaseCard` UI exists but ticket checkout (Step 4) not yet implemented; purchase buttons are placeholders. |
| **Events — QR / PDF** | No QR code generation or PDF ticket delivery yet (Steps 5–6). |
| **No `TODO` flood** | Few explicit TODOs; gaps inferred from duplicate systems and stub copy rather than comments. |
| **Cart server action** | `app/actions/cart.ts` targets listing cart; client cart store may use products — confirm when changing cart behavior. |
| **Schema vs production DB** | Vendor split-order / service availability queries use safe `select` lists when Neon lags `schema.prisma`; run `scripts/neon-product-availability-columns.sql` when availability columns missing. |
| **PDP width** | Product page uses `w-full px-8` (no `max-w-*` on main shell); perceived narrowness may be from grid `1fr 1.2fr 360px` (image column ~30% of flexible width). |

---

## Key Architecture Decisions

### Auth and sessions
- **JWT** in httpOnly cookie (`SESSION_COOKIE_NAME`), signed with `AUTH_SECRET` via `jose`.
- **Server:** `getSession()` (React `cache`) reads cookie; layouts call `getCurrentUser()` for DB user.
- **Middleware** only protects route prefixes; public pages use optional session in components.
- **Passwords:** bcrypt in `lib/auth/password.ts`.
- **Rate limits:** `RateLimit` model + `checkRateLimit` on registration.

### Server actions
- Live under `app/actions/*.ts` with `"use server"`.
- Typical flow: validate session → validate input → Prisma mutation → `revalidatePath` → return `{ ok }` / `{ error }` (avoid leaking raw errors to client).
- Large domain files (`vendor.ts`, `checkout.ts`, `fulfillment.ts`) group related mutations.

### Notifications
- Created via `createNotification({ userId, type, title, body, linkUrl })` from checkout, bookings, on-demand, reviews, etc.
- Types defined in Prisma `NotificationType` enum.
- UI: `NotificationBell` + server `getNotifications` / mark read.
- Failures in `createNotification` are swallowed so mutations never crash.

### Stripe
- **Checkout:** `createPaymentIntent` in `app/actions/checkout.ts` — metadata `orderId` on PaymentIntent.
- **Webhook:** `app/api/webhooks/stripe/route.ts` — `payment_intent.succeeded` → order PAID + split order creation; `checkout.session.completed` for on-demand.
- **Client:** `@stripe/react-stripe-js` in `checkout-client.tsx`.
- **Server singleton:** `lib/stripe/stripe.ts`.

### Image uploads
- **Primary:** Cloudinary upload stream in `lib/uploads/upload.ts` (folders: products, gallery, kyc, etc.).
- **Helpers:** `lib/uploads/save-gallery-upload.ts`, `lib/onboarding/save-kyc-upload.ts`, `lib/listing/local-listing-upload.ts` (legacy local + Cloudinary).
- **Next image config** allows `res.cloudinary.com` and Google user content.

### AI chat (customer)
- **Route:** `POST /api/chat` streams Anthropic messages.
- **Model:** `claude-sonnet-4-5`.
- **Tools:** `search_products` (via `searchProducts` action), `add_to_cart` (via `addToCart` action), `search_events` (queries published events by keyword, category, region, dateFilter).
- **Prompt:** `lib/chat/systemPrompt.ts` (Trinidad-local tone, outfit queries, events awareness).
- **UI:** `components/chat/ShoppingChat.tsx`.

### AI (vendor)
- **Route:** `POST /api/vendor-ai` (large handler).
- **Actions:** `ai-vendor.ts`, `ai-vendor-update.ts`, `ai-vendor-store.ts`, `ai-vendor-image.ts`, `ai-bulk-upload.ts`.
- **Prompt:** `lib/chat/vendorSystemPrompt.ts`.

### Fulfillment
- **MainOrder** → **SplitOrder** per store via `lib/fulfillment/split-orders.ts`.
- Status progression for vendor prep, warehouse, courier, delivery (see `SplitOrderStatus` enum).
- **Warehouse** receiving via `warehouse.ts` actions and `WarehouseOrderLine`.

### Cart state (client)
- **Zustand** `lib/cart/cart-store.ts` + `CartProvider` for drawer UI and badge counts (hydration-safe with `mounted` checks in nav).

---

## API Integrations

| Service | Role in LinkWe |
|---------|----------------|
| **PostgreSQL** | Primary database via Prisma (`DATABASE_URL`). Hosted options mentioned in comments (Supabase/Neon). |
| **Stripe** | Card payments at checkout; webhooks finalize orders; optional Checkout for on-demand. |
| **Cloudinary** | Product/store/gallery/KYC image hosting and transforms. |
| **Anthropic (Claude)** | Customer shopping chat and vendor AI assistant. |
| **Resend** | Transactional email (order confirmations, vendor alerts) via `lib/email/send.ts` + templates. |
| **Mapbox** | Store maps and geocoding in `StoreLocationPicker` / `StorefrontMapAndProducts`. |
| **Google Maps / Places** | Optional Places API key for address autocomplete. |
| **@react-google-maps/api** | Google map embed where used. |
| **Leaflet** | Additional map support in dependencies. |

No other paid APIs identified as required for core paths beyond optional Google Places.

---

## Mobile & PWA

### Mobile navigation (`PublicNav.tsx`)
- **Desktop (md+):** Fixed 60px glass header — logo, centered `NavSearchInput` (preview dropdown → `/search?q=` on submit), links (Shop, Services, Stores, Events, AI), bell, cart, avatar or Sign in.
- **Mobile header:** Logo, search opens **`MobileSearchOverlay`** (`NavSearchInput`), cart + avatar or Sign in.
- **Bottom tabs (lg hidden):** Home, Shop, **Search → `/search`**, Cart, Account — Tabler icons, scarlet active state, cart badge, `safe-area-inset-bottom` via `.pb-mobile-public`.
- **Transparent mode:** `/store/[slug]` sets `transparent` on nav so hero sits under glass header.
- **Account drawer (logged in):** Slide-over — dashboard, browse, account links, notifications, sign out; role pill (Vendor/Courier/Admin/Customer).

### PWA setup
| Piece | Location |
|-------|----------|
| **Manifest** | `public/manifest.json` — `name` LinkWe, `standalone`, `start_url` `/`, theme `#1C1C1A`, background `#F7F5F2`, icons 72–512, shortcuts Shop/Services/Orders |
| **Service worker** | `public/sw.js` — caches `/`, `/offline`, manifest, icons; network-first fetch; push handler stub |
| **Registration** | `components/pwa/ServiceWorkerRegistration.tsx` registers `/sw.js` on load |
| **Install prompt** | Inline script in `app/layout.tsx` sets `window.__pwaInstallPrompt` before React; `use-pwa-install.ts` attaches listeners once, exposes `install()`; `InstallPrompt.tsx`, footer strip, nav drawer; `/get-app` page |
| **Offline page** | `/offline` |

### Manifest summary
Standalone PWA branded LinkWe, portrait-primary, English, shopping/lifestyle categories, home screen shortcuts to shop, services, and orders.

---

## Conventions for contributors

- Read `AGENTS.md` / Next.js 16 docs in `node_modules/next/dist/docs/` before assuming older Next APIs.
- Prefer **Server Actions** over new API routes unless streaming/binary required.
- Use **Prisma** only (no raw SQL except documented JSON containment queries in shop filters).
- Do not modify auth unless instructed; role routing lives in dashboard layouts.
- Brand scarlet: `#D4450A`; page background: `#F5F5F5`; font: **Sora**.

---

*Last synced 28 May 2026 (end of day). Re-run discovery after major refactors.*
