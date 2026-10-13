# Admin analytics hub — local review

Extends `/dashboard/admin/analytics` from production `9572f48389b35f7c252c1e7e406e072ef07f0f57` on branch `codex/admin-analytics-hub`. Production publication is held for coordinated review. Existing Pro stock, marketing, GA collection, billing and permissions are unchanged. No schema migration, external connection, secret or recurring paid service is added.

## What changed

The initial snapshot is rendered after a current ADMIN session check; every data refresh independently checks ADMIN again. `getSession` reads the current role, active flag and suspension from the database. Private report navigation is supplied only after this check, not embedded or included in public JavaScript. Google continues to enforce its own report permissions. Other LinkWe admins need separate Google access to open the owner-only report.

The overview prioritizes account creation, new stores, saved store setup and measured visitors. Six areas (Overview, Acquisition, Vendor activation, Social & ads, Business and Source health) group all existing reports without removing their bookmarks. Visitor filters and detailed coverage expand on demand. Duplicate overview financial panels now live in Business. The mobile Rex launcher sits in the page flow instead of covering report content. Sections and filters form a bookmarkable URL. Freshness is visible above every report and warns when the loaded snapshot is over 15 minutes old; no background data polling is added. Data connections distinguish internal records, first-party visitor activity, WebsiteDaily, GBPmonthly and Meta. Unknown external values and timestamps remain unavailable, not zero. CSV exports include these coverage states.

Account creation counts use `users.created_at` and current CUSTOMER/VENDOR roles, excluding ADMIN/COURIER. They include imported and administrator-created accounts, and are not presented as attributed self-service signups. Store setup uses the current `onboarding_step >= 3` among vendor-owned stores created in the selected period. There is no setup-completion timestamp, so this is explicitly a current cohort state, not completions during the period or a historical conversion rate. Saved setup does not imply approval or a live storefront. Visitor source/device filters do not alter these business totals.

Free-text searches are withheld from reports, insights and CSV exports because they can contain names or other personal details. Aggregate unmet-demand counts remain available. No customer profile identifiers or contact details are added to analytics responses.

## Rex evidence and controls

Analytics Rex uses a dedicated policy and fixed server-owned tool definitions. It discards client reports, arbitrary state, tool descriptions and comparison values; at most three validated comparison filters are queried again through the ADMIN-only report action. The server returns the same current report to the UI before showing Rex's answer. Creation Studio and analytics conversation state are separated. Individual-record lookup tools cannot execute in analytics, even if a model returns their names.

Shared source definitions distinguish unique users/reach, sessions, lifetime post cohorts, daily ads, current follower snapshots, whole-month GBP, currencies, zero versus missing, coverage and manual versus automatic refresh. They explicitly leave acquisition-to-account activation attribution unknown. External data becomes evidence only after an authorized server read; the current local preview remains disconnected. `scripts/test-analytics-rex.cjs` verifies the context/tool contract using a mocked model and forbids network calls; it does not assess live model answer quality. The local preview removes the model API key.

## Native external analytics adapter

The existing tab now includes native source panels backed by an opt-in, server-only Sheets reader. Website/GBP groups appear under Acquisition; posts, audience snapshots and ads appear under Social & ads. UI, CSV and Rex consume the same verified snapshot. Source health keeps importer extraction time separate from the dashboard query, Sheet read/cache time and reported refresh-log state.

The normalizer enforces the verified tab/header contract, excludes private/freeform fields, keeps currencies/timezones/attribution settings separate, distinguishes missing from zero, deduplicates stable natural keys and preserves nonadditive users/reach/follower semantics. Daily sources exclude partial reporting days; lifetime posts use publication cohorts; GBP includes whole months only. No copied live totals are embedded in source or fixtures.

The read path is disabled until a separately approved identity and workbook Viewer grant are configured. The local preview launcher strips inherited Sheet/OIDC and model credentials. No live server read, credentials, grants, schema migration or deployment were performed. See [the implementation and identity inventory](analytics-sheet-read-plan.md) for exact variables, limits, tests and remaining access work.

## Local review and checks

The dedicated database is `127.0.0.1:55440/linkwe_analytics_test`; its cluster lives beside the checkout in `linkwe-admin-analytics-local-db`. It contains synthetic review/test data only. Test scripts reject other database hosts/ports/names where applicable; the existing analytics suite also rejects non-loopback databases. `.env` files are not used by the preview launcher.

Local build (does not run the production migration command):

```sh
DATABASE_URL='postgresql://kylescott@127.0.0.1:55440/linkwe_analytics_test' DIRECT_URL='postgresql://kylescott@127.0.0.1:55440/linkwe_analytics_test' AUTH_SECRET='local-analytics-review-only-not-a-production-secret' RESEND_API_KEY='re_local_build_placeholder' VERCEL_ENV=preview NEXT_TELEMETRY_DISABLED=1 SENTRY_AUTH_TOKEN='' node node_modules/next/dist/bin/next build --webpack
```

The database was initialized with `initdb`, bound to loopback on port 55440, and given the existing schema using `prisma db push --skip-generate` with the local URLs above. No production database was contacted.

Seed and run:

```sh
DATABASE_URL='postgresql://kylescott@127.0.0.1:55440/linkwe_analytics_test' node scripts/preview-admin-analytics.cjs
python3 scripts/start-admin-analytics-preview.py
```

Open `http://127.0.0.1:3159/dashboard/admin/analytics`. Local-only login: `analytics-preview@example.test` / `AnalyticsPreview-LocalOnly!`. These credentials are deliberately fake and work only in this isolated database. Demo figures are 12 customer/vendor account creations, 4 stores and 2 saved setups; no payments or social totals are seeded. A restart requires the launcher; it refuses an occupied preview port.

With the same local DATABASE_URL and AUTH_SECRET, run:

- `node scripts/test-analytics.cjs`: existing consent, privacy, payment classification, ordered funnel, device/source scope, idempotency and export checks.
- `node scripts/test-admin-analytics-hub.cjs`: page/action authorization, real account/store aggregates, imported accounts, cohort boundaries, absent sources, unavailable visitor data, safe exports and server-rendered markup.
- `node scripts/test-analytics-sheets.cjs`: 22 synthetic tests for schema/transport, ADMIN/cache denial, privacy, currencies/timezones, natural keys, reporting boundaries, ratio reconciliation, stale retention, request-token precedence and rendered panels; live network is forbidden.
- `node scripts/test-analytics-rex.cjs`: 10 isolated mocked context/tool/security checks with no paid model calls.
- `node scripts/test-admin-analytics-browser.mjs`: 5 isolated Chrome headless checks; requires the compiled preview, the documented local DATABASE_URL and AUTH_SECRET, and the installed Chrome executable. Uses a signed synthetic ADMIN session, not the login form. Captures 1440px desktop, 390px phone and 320px narrow layouts, navigation/filter/reload, Rex open/close and cleared-session protection. It never attaches to the shared interactive browser.
- `node scripts/test-admin-analytics-http.cjs`: compiled HTTP checks, including forged ADMIN claims for other roles, inactive/suspended admins, role revocation, private cache behavior and no unauthenticated report disclosure.

Full TypeScript, scoped ESLint, whitespace and optimized-build results are recorded beside this checkout in `linkwe-admin-analytics-*` evidence files. Current screenshots and browser results are in `linkwe-admin-analytics-qa/enhanced`. The final headless run reported no runtime exceptions or horizontal overflow. The desktop and mobile overview screenshots were visually inspected after fixing metric-note spacing. A separate earlier interactive session verified demo login, but its tab cleanup could not be confirmed after the browser tool timed out; no further shared-browser actions are needed for this review.

## Verified checkpoint

The earlier UI checkpoint passed 40 analytics/hub/Rex/compiled-HTTP checks and five isolated headless checks at desktop, mobile and narrow widths. Screenshots in `linkwe-admin-analytics-qa/enhanced` depict that checkpoint, before the native adapter. This adapter update passed 22 synthetic reconciliation/security/rendering tests, full TypeScript, scoped ESLint, an optimized local build, all 30 existing database/hub/mocked Rex checks and 10 compiled HTTP authorization checks (62 current checks total). Private report/workbook identifiers and server reader configuration were absent from public JavaScript. It does not use the shared Mac browser.

The preview uses a local-only signing fixture that meets the application's 32-character minimum. Production auth code and secrets were never changed. Live paid Rex answer-quality checks, real external-feed reconciliation and production publication remain outside this checkpoint. No schema migration was added.

## Production release preparation

The separately approved keyless production reader is configured with access to one private workbook and an exact production-only federation subject. No migration was introduced during release preparation. The private Google report link now comes from validated, server-only production configuration and is omitted when unconfigured. Private connection identifiers were removed from the public connection-plan documentation; they remain in the private release evidence. Live deployment and data reconciliation results are recorded separately from the synthetic test results above.
