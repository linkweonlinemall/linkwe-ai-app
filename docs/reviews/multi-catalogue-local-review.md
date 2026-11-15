# Multiple store catalogues: isolated implementation review

Base: `37a24e1a4a0fed4cbf3817584ff6d99af4cff1bf` (verified remote main).
Branch: `feat/multi-catalogue-local`. No push, PR, deployment or live database/catalogue change performed.

## Implemented
- Vendors can create, name, describe, edit and remove up to 50 named catalogues; choose up to 500 existing product/service IDs per catalogue. Membership can overlap.
- Additive store JSON document and revision. One atomic revision-checked update avoids lost updates; all member IDs must belong to authenticated vendor's store and be nonarchived.
- Collections never write featured, published, price, stock or other product fields. Drafts can be selected but remain invisible publicly. Existing Store picks/flat catalogue remains untouched.
- Server public projection strips all IDs not in the store's published, nonarchived listing set; client independently intersects supplied listings for accurate counts/covers.
- Collection tiles and distinct editorial product-card styling in the Catalogue tab; products/services modes preserved. In-tab native History API selection, `c_collection` shareable IDs, existing filters and copy link preserved. Invalid IDs and empty collections have explicit states.
- Vendor revision conflicts fail safely. Unavailable memberships warn and require explicit removal. Invalid stored documents stop vendor editing rather than silently replacing data. Unsaved changes warn before browser unload.
- Fictional public/vendor previews at `/dev/store-catalogue?tab=catalogue` and `/dev/catalogue-preview`; preview saves/shopping disabled, pages development-only.

## Verification completed
- `npm run build`: passed with fixture-only loopback DATABASE_URL; production migration branch NOT invoked.
- `npx tsc --noEmit`: passed.
- Targeted ESLint for all changed TS/TSX files: passed.
- `git diff --check`: passed.
- `node scripts/test-collections.cjs`: 8 pure validation/transaction-boundary checks.
- `node scripts/test-public-collections.cjs`: 6 public membership/filter/count checks.
- `node scripts/test-collections-ui.cjs`: 6 server-rendered UI contracts.
- `node scripts/test-collections-db.cjs`: 7 real PostgreSQL integration checks in a new, isolated loopback database (`127.0.0.1:55477/collections_test`), stopped/removed afterward. Includes ownership, drafts, concurrency one-winner, unchanged products, additive SQL migration preserving preexisting fixture records.
- Existing store catalogue, vendor catalogue, vendor UI, variant attributes/editor, product display and service display regression runners all passed. Logs kept in `/tmp/linkwe-multi-*`.
- Independent source review found no tenant/publication leakage. Two lifecycle findings (silent membership pruning and revision remount) were corrected.

## Verification still required before release
Real interactive browser and visual desktop/mobile/accessibility QA NOT completed: headless Chromium launch fails `socket() Operation not permitted`; dedicated cloud CUA tab cannot reach local preview (`net::ERR_CONNECTION_REFUSED`). SSR checks do not verify hydration, keyboard interactions, responsive overflow, actual clipboard, browser Back or zero-reload behavior. No screenshots claimed.

## Release / rollout considerations
Apply additive migration before serving code that selects new columns, using normal reviewed release workflow. No automatic migration of legacy featured picks. Code rollback may leave harmless additive columns, but do NOT drop them after vendors save collections. Existing public collection URLs use stable IDs, so renaming retains links; deleting a collection yields explicit unavailable state. Bounds are reasonable defaults, not a user-chosen commercial plan limit. Cover uses first visible member image; custom cover uploads and drag ordering are not in this iteration. Collections are public immediately when saved (only published members visible); separate collection draft/publish workflow is not implemented. No new requirements need user input for this scoped implementation, but further voice refinements may supersede it.

## Follow-up: safe Vercel preview fixture surfaces

Only these paths are authorized fixture-review surfaces on an eventual branch preview:
- `https://<exact-preview-host>/dev/store-catalogue?tab=catalogue`
- `https://<exact-preview-host>/dev/catalogue-preview`

Both allow explicit `VERCEL_ENV=preview`, as well as local development, and deny explicit production. Exact proxy matchers deny production before streaming/authentication. The pages retain their own server gate as defense in depth. Do not use `/dev/catalogue-review`: that older page remains development-only and is not part of this isolated fixture surface.

The root runtime providers were extracted without changing their normal ordering, then bypassed for these exact two fixture paths: no cart hydration, analytics, push identity, service worker, install prompts or real footer navigation mounts. Preview public tabs are limited to Catalogue / The collection / Services. Listing navigation is inert with prefetch disabled; wishlist/cart and vendor save actions remain disabled. Empty vendor states do not link out to a live management page. Fixture components use literal fictional data only and contain no session or DB reads.

**Unmigrated preview DB warning:** normal `/store/[slug]` and vendor catalogue pages select the new columns; they are NOT safe functional verification surfaces against an old shared schema. Other generic Prisma store queries can also select all columns. Do not exercise real storefront/admin/vendor flows during fixture review, and do not migrate a shared/production DB to unblock a preview. Fixture HTTP tests intentionally use a nonexistent loopback DB to prove the two fixture routes do not require it. The additive migration is still required as a separately approved production release step.

Follow-up validation passed: production-mode build with `VERCEL_ENV=preview`, targeted ESLint, existing catalogue SSR/filter/vendor UI/variant editor checks; new environment-gate/runtime-isolation test; actual production Next HTTP server returned **200 for both preview fixtures and 404 for both production fixture paths**, using only a nonexistent loopback DB and no application credentials. Both local HTTP servers shut down afterward. This verifies server routing/isolation, not visual or browser interaction QA.
