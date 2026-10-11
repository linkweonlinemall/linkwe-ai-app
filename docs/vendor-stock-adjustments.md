# Vendor live stock updates

The vendor dashboard now has **Catalog → Live stock update**, plus a shortcut from Creation Zone. Vendors search names, SKUs and size/colour attributes; filter by category or stock; select up to 100 exact stock items; enter an individual deduction per item; explicitly add each amount to the update; review remaining stock; and apply one batch. Search and filter changes retain selections. The existing workspace shell, navigation search, mobile More menu, page typography, colours and spacing are reused. Phone layouts stack product cards and keep the review action above the dashboard navigation.

This is an inventory feature. It creates no order, invoice, payment, commission or financial sale. The last ten adjustments are visible in the vendor's inventory history.

## Isolation and review

- Original checkout: `/Users/kylescott/Desktop/linkwe-ai-app`, branch `codex/admin-operations-redesign`, original HEAD `0a8dbc92a1ad6e532417ceab7523367ec83f0d68`.
- Isolated checkout: `/Users/kylescott/Documents/Codex/2026-10-10/task/linkwe-stock-adjustment`.
- Feature branch: `codex/vendor-bulk-stock-adjustment`.
- Current application source (including existing dirty dashboard work) was copied into snapshot commit `3a64f000ac691dcc40298a80063f87b2e96791a3`. Generated outputs, dependencies and environment secrets are not in that snapshot commit. Dependencies were copied separately so Prisma generation does not mutate the original checkout.
- Review only `git diff 3a64f000ac691dcc40298a80063f87b2e96791a3 HEAD`. Do not merge or cherry-pick the snapshot commit into another branch: it includes unrelated pre-existing work. The feature commit/patch contains only the files listed below.
- No publishing, pushing, merging, deployment or production migration was performed.

## Per-item confirmation revision

Each checked stock option now has a quantity input and **Add to update** button beside it. Selecting a checkbox or typing a number only creates a local draft. Adding the amount shows a tick, an **Added** button and the precise message, such as **2 selected for deduction**. The summary counts confirmed amounts only.

Editing any added quantity immediately removes that line from the confirmed batch and removes the success message. The row says **Quantity changed. Add it again to confirm.** Even changing the number back to its old value requires explicitly adding it again. Review remains disabled until all checked options are added or deselected. Adding an item validates its quantity and the combined shared product stock, without a server call or stock write. The existing final confirmation, atomic transaction, audit and retry identity are unchanged.

The controls use the existing navy buttons, green confirmations, inline validation and 44px mobile targets. Quantity and action remain side by side, with the confirmation underneath. The amount field references its live status and validation message for assistive technology.

`node scripts/test-vendor-stock-staging.cjs` passes **13 checks** covering draft versus staged state, exact variant quantities, pure local staging, repeated adds, edits/reverts, multi-item review blocking, invalid quantities and shared stock, refreshed stock, retained selection across filters, pending-request recovery, and the rendered accessible control states. The existing **25 inventory checks** also pass against a separate `stock_staging_checks` schema in the disposable database, preserving the demo's public-schema inventory and history. TypeScript, scoped lint, CSS parsing, the complete Next build and all three compiled-route HTTP checks pass. The local server was rebuilt once and restarted on port 3157, with the new staging instructions verified in its rendered response. No application dependency or database migration was added by this revision.

The Mac browser belongs to the dashboard task during this revision, so it is not opened or controlled. Earlier desktop/mobile screenshots show the first revision; refreshed visual inspection of these new controls is still pending. Once the local server has restarted, reload the preview tab to load the new client code.

## Inventory and retry semantics

### Pro-only entitlement

Live stock updates and their QR scanner require the existing **PRO** tier, an **ACTIVE** subscription and a non-expired `planRenewsAt` when present. This matches the existing paid Photo Studio period rule; an active legacy Pro subscription with no renewal date remains eligible. The model defines STARTER (free), SERVICES, GROWTH and PRO, with no tier above Pro. Lower tiers, unknown values, inactive and expired subscriptions are denied. Prices, billing and subscriptions are not modified.

The server page returns a Finance upgrade/renewal screen before reading stock items or receipts. Creation Zone routes ineligible vendors to Finance and the dashboard link is labelled Pro. Ordinary product management, its existing stock editor, and QR Studio label generation remain available. All three stock server actions are guarded: catalog refresh, QR lookup and final submission. The final action checks the current owned store's entitlement inside its serializable transaction, before even replaying an old request. Client-supplied plan claims do not grant access. A downgrade/expiry response preserves the pending request key so a renewal followed by retry still cannot deduct twice.

Entitlement tests cover every blocked tier/status, expired and exact-boundary renewal dates, unknown plans, Free direct action attempts, preserved ordinary catalog access, active Pro, and downgrade/renewal idempotency. The disposable preview vendor is explicitly a test-only active Pro fixture; no live subscription was changed.

### Product QR scanning revision

**Scan product QR** opens a compact scanner in the catalog. Camera access begins only after **Start camera**, with the browser's ordinary permission request. The camera prefers the rear lens, captures one QR and stops. Closing the scanner, leaving the page or hiding the tab releases the camera; late frames and delayed permission results are ignored and cleaned up. Denied/unavailable camera access leaves **Paste the product QR link** and **Search instead** available. No permission setting is changed programmatically.

Existing QR Studio product labels are reused unchanged: `https://www.linkweonlinemall.com/products/<slug>`. The bare canonical host, HTTP spelling and trailing slash are accepted too. The strict parser rejects other hosts, non-product paths, credentials, explicit ports, normalization tricks, query strings and fragments. Unsupported variant parameters are rejected rather than silently interpreted as an exact option. The decoded address is never opened or fetched. Only a same-origin authenticated server action resolves the slug in the current vendor's eligible physical catalog; an expected store ID prevents stale-account lookups. Foreign, missing, archived, service and digital items return the same unavailable response without names or stock.

Successful lookup merges the fresh product into the catalog, clears filters and focuses its card at the top, showing its photo (or existing placeholder), name, exact options and current finite stock limits. A simple product gets an unconfirmed quantity-one draft. Variant products always require explicit option selection, including a single variant or legacy rows whose flag is false. Scanning an existing selection preserves its quantity and staging state and never increments it. Out-of-stock/untracked items are shown without preparing an invalid draft. **Add to update** stages locally; batch review and final confirmation use the existing atomic, concurrency-safe and idempotent action. Scanning creates no stock receipt or financial record. Fresh stock is checked again at final submission.

No variant-specific QR format, QR Studio changes, dependency or schema migration was needed. Old public destinations remain unchanged. The scanner uses the already-installed `html5-qrcode` decoder, loaded only after camera start. Its stream/duplicate-frame lifecycle is separate from event check-in; no admission, payment, order or offline admission code is reused.

Device limits: camera scanning requires a camera, a browser exposing `getUserMedia`, a secure origin (HTTPS or localhost on the same device), and user permission. Rear-camera selection is preferred; there is no camera-switch/torch UI in this first version. No specific phone/browser version has yet been physically validated. Embedded browsers, disabled permissions or cameras in use can fail; paste/search remains available. Internet is required for owned-product lookup and final deduction; this does not queue offline adjustments. The local preview binds only to this Mac's `127.0.0.1:3157`, so it is not reachable from a phone. Phone camera review needs a separately approved reachable HTTPS test environment; no tunnel or deployment was created.

QR checks: `node scripts/test-vendor-stock-qr.cjs` passes 13 parser, staging, duplicate-frame, lifecycle and actual initial-markup checks without a browser. The inventory integration suite now passes 30 checks in the separate disposable `stock_staging_checks` schema, including QR access boundaries, redacted foreign/missing results, fresh variant stock, stale-stock rollback and concurrent repeat submissions. The existing 13 staging checks, full TypeScript, scoped ESLint and CSS parse pass. `next build --webpack` and all four compiled HTTP checks pass, including QR action authentication/store validation, lookup without mutation and the actual final action's duplicate protection. The rebuilt detached preview is running on the same loopback port 3157. No GUI/browser interaction or real camera test was performed in this revision; visual and physical-device review remain pending through the parent task.

For review, paste `https://www.linkweonlinemall.com/products/stock-review-bag` for a simple item or `https://www.linkweonlinemall.com/products/stock-review-shirt` for exact size/colour selection. These labels identify fixtures in the local database; their public URLs are not deployed listings. Matching test PNGs are saved outside the repository in `../linkwe-stock-qr-labels/`. Nothing was printed, opened in a browser or applied to demo stock during scanner development. Foreground/camera QA must be coordinated through the parent task.

`Product.stock` and `ProductVariant.stock` are independently nullable. Null means unlimited/untracked, not zero. For a variant, availability is the minimum of all finite limits. Each selected variant loses its own quantity when finite; shared product stock loses the sum of all selected options when finite. A wholly unlimited item cannot be deducted until a finite stock quantity is set in its editor. Existing variant rows require explicit selection even if a legacy `hasVariants` flag is false. Services, digital products and archived products cannot be adjusted; physical draft products can.

Every server action checks the current vendor session. The transaction derives the store from the authenticated owner's ID and restricts every product to that store. The submitted store ID only detects account switches; it never grants access. Variant IDs are resolved within each owned product. Invalid or foreign IDs return no foreign product names or inventory.

All deductions and their receipt run in a PostgreSQL serializable transaction with bounded retries for serialization/deadlock or concurrent idempotency conflicts. Updates also require stock greater than or equal to the deduction. A failed line rolls back every earlier line and the receipt. Deterministic product/variant ordering reduces deadlocks. Existing guarded shared-stock writers conflict safely with this transaction.

Each submitted batch gets a UUID request ID saved in browser storage before its first request. A unique `(store_id, request_id)` key and a canonical SHA-256 hash of the quantities make simultaneous submissions/retries return one receipt. Reusing the key for different quantities is rejected. Pending requests survive reloads; uncertain responses keep the review locked to the same request until confirmed. Authentication expiry or account switching also preserves that request. A synchronous client guard prevents duplicate clicks before React rerenders. Storage access is required before submitting.

Audit snapshots retain product/option names, IDs, each quantity, before/after inventory, authenticated actor, store and timestamp. Product/variant deletion does not erase those snapshots. Shared before/after stock is repeated on each variant line to describe the whole batch; it is not a per-line running balance. The store relation restricts deletion while its inventory audit exists.

Existing online fulfilment currently decrements shared `Product.stock`; it does not decrement `ProductVariant.stock`. That pre-existing behavior is outside this inventory-only feature and was not changed. This feature correctly deducts both finite limits.

## Migration

`prisma/migrations/20261011010000_vendor_stock_adjustments/migration.sql` adds only `stock_adjustments`, its store foreign key, a positive total-quantity check, a unique idempotency index and a history index. It changes no current stock or financial records. The matching Prisma model adds a relation on Store.

The migration was exercised only on a new PostgreSQL cluster under `/tmp/linkwe-stock-test-pg`, bound to `127.0.0.1:55439`, database `linkwe_stock_test`. The test first builds the full development schema, removes the empty test audit table, then applies the actual migration SQL and checks its constraints. The application development database and production were not contacted. Apply this migration and regenerate Prisma before using the page in an approved environment; production rollout remains unapproved.

## Validation

- `node scripts/test-vendor-stock.cjs`: strict payload/quantity validation, canonical keys, nullable stock semantics, catalog search/filter, aggregate review validation.
- `DATABASE_URL=postgresql://kylescott@127.0.0.1:55439/linkwe_stock_test DIRECT_URL=postgresql://kylescott@127.0.0.1:55439/linkwe_stock_test node scripts/test-vendor-stock.cjs --integration`: **25 checks passed**, including the model checks, real migration, vendor/customer/admin/anonymous boundaries, forged ownership, mismatched and missing variants, mixed batches, shared/variant over-deduction and rollback, unlimited stock, excluded product types, legacy flags, concurrent product/variant/shared limits, four simultaneous duplicate submissions, altered/reordered payloads, lost acknowledgement, expired/switched sessions, scoped history and unchanged financial record counts. Test fixtures are removed in `finally`.
- Full TypeScript check and ESLint on all changed TypeScript/TSX files passed.
- `next build --webpack` passed for the complete application, including `/dashboard/vendor/catalog`. The direct CLI bypassed the production migration wrapper. Existing font downloads required network access; existing mail module initialization used an inert local placeholder, with no provider sends.
- `scripts/test-vendor-stock-http.cjs`: **3 HTTP checks passed** against the compiled local server: anonymous redirect and authenticated native catalog rendering; unsigned submissions and a stale vendor JWT for a current customer denied; real server action handles two concurrent duplicates with one receipt and rejects altered reuse. Temporary HTTP test records were removed. No browser control was used.
- Existing `test-shop-query.cjs`, `test-customer-shopping.cjs`, `test-creation-coupons.cjs`, `test-product-display.mjs` and `test-workspace-upgrades.cjs` passed.
- After browser control was released, the real Chrome preview was signed in with its disposable vendor. Desktop and 390px phone review layouts, variant selection, individual number entry and the review screen were visually checked. Temporary viewport overrides were reset. The review was left open with two demo lines (five units), without submitting a deduction. Full interrupted-response browser testing remains covered only at the server/HTTP layer.

## Local review

For a disposable local database with the development schema and this migration, `scripts/preview-vendor-stock.cjs` creates four clearly named demo products and a `.test` vendor. It refuses every target except `127.0.0.1:55439/linkwe_stock_test`, never reads `.env`, and calls no external services. The fixture password is intentionally a local-only example, not a real credential.

```sh
export DATABASE_URL='postgresql://kylescott@127.0.0.1:55439/linkwe_stock_test'
export DIRECT_URL="$DATABASE_URL"
export AUTH_SECRET='local-stock-review-only-not-a-production-secret'
export RESEND_API_KEY='re_local_build_placeholder'
node scripts/preview-vendor-stock.cjs
./node_modules/.bin/next start --hostname 127.0.0.1 --port 3157
```

The original task-managed web process stopped, causing the localhost link to refuse connections. It was restarted as a detached process using `python3 scripts/start-stock-preview.py`, with the private test cluster on port 55439. The runner sets `VERCEL_ENV=preview` to keep optional analytics out of the local demo. The existing compiled build is reused: no new build or disk cleanup was needed.

Two desktop items were created without overwriting existing files: `/Users/kylescott/Desktop/LinkWe Stock Tool - Local Preview.webloc` opens the catalog, and `/Users/kylescott/Desktop/Start LinkWe Stock Preview.command` starts/checks the server and then opens it. The server must be running on this Mac; this is not a production deployment or permanent hosted URL. The signed-in preview is already open in Chrome tab `2056466856`. Once browser access is available, log into `http://127.0.0.1:3157/login` with `stock-preview@example.test` / `StockPreview-LocalOnly!`, then visit `/dashboard/vendor/catalog`. Check desktop and 320/390px layouts, retained selections across filters, variant quantities, shared-stock validation, review/edit, apply, rapid double-click and interrupted-response/reload recovery. Stop only this review server and the dedicated test cluster afterward.

## Exact feature files

- `app/(dashboard)/dashboard/vendor/catalog/page.tsx`
- `app/actions/vendor-stock.ts`
- `components/vendor/creation/CreationLibrary.tsx`
- `components/vendor/dashboard-navigation.ts`
- `components/vendor/stock/StockWorkspace.tsx`
- `components/vendor/stock/StockQuantityEditor.tsx`
- `components/vendor/stock/StockQrScanner.tsx`
- `components/vendor/stock/StockUpgrade.tsx`
- `components/vendor/stock/stock-workspace.module.css`
- `lib/vendor/stock/model.ts`
- `lib/vendor/stock/staging.ts`
- `lib/vendor/stock/adjust.ts`
- `lib/vendor/stock/query.ts`
- `lib/vendor/stock/scan.ts`
- `lib/vendor/stock/resolve-qr.ts`
- `lib/vendor/stock/camera.ts`
- `lib/vendor/stock/access.ts`
- `lib/vendor/creation/model.ts`
- `lib/vendor/creation/query.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20261011010000_vendor_stock_adjustments/migration.sql`
- `scripts/test-vendor-stock.cjs`
- `scripts/test-vendor-stock-staging.cjs`
- `scripts/test-vendor-stock-qr.cjs`
- `scripts/preview-vendor-stock.cjs`
- `scripts/test-vendor-stock-http.cjs`
- `scripts/run-stock-preview.command`
- `scripts/start-stock-preview.py`
- `docs/vendor-stock-adjustments.md`
