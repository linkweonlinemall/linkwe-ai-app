# Private analytics workbook: read-only adapter and connection plan

Read-only adapter implemented and fixture-tested 13 October 2026. The approved production identity and server configuration are verified. Live results must be verified after deployment; private connection identifiers and release evidence are kept outside the public repository.

## Smallest suitable connection

Use the Google Sheets API from a server-only module, with a dedicated identity that has Viewer access to the one approved analytics workbook. Request `spreadsheets.readonly`; do not reuse the website's Google login tokens, request broad Drive access, or enable domain-wide delegation. The existing Google OAuth implementation is for sign-in and provides no approved Sheets reader.

Google applies scopes at workbook level, not individual tabs. A tab/range allowlist in code limits normal application reads but does not reduce the identity's underlying access. If access to the whole workbook (including private source links and strategy notes) is unacceptable, first approve a separate aggregate-only workbook and grant the reader access only to that file. [Google scope documentation](https://developers.google.com/workspace/sheets/api/scopes)

The adapter uses a 15-minute per-process cache, coalesces concurrent reads, makes two bounded Sheets GET requests per refresh and retries a transient failure once. It changes no quotas. Serverless instances have independent caches; verify expected load and current quota/billing policy before enabling the connection. [Google usage limits](https://developers.google.com/workspace/sheets/api/limits)

## Production connection and release boundary

The approved production connection uses a dedicated keyless Google service account with Viewer access to one private analytics workbook. Google Cloud Workload Identity Federation accepts only the exact Vercel project production subject, with a service-account-scoped Workload Identity User grant. Local and preview identities are excluded. The Google IAM, Resource Manager, IAM Credentials, STS and Sheets APIs are enabled in the existing project. No permanent key, billing change, broad project role, public workbook or Google sign-in scope change is required.

The Sheet reader has five server-only settings: `LINKWE_ANALYTICS_SHEETS_ENABLED`, `LINKWE_ANALYTICS_SHEETS_ID`, `LINKWE_ANALYTICS_GOOGLE_AUDIENCE` and `LINKWE_ANALYTICS_GOOGLE_SERVICE_ACCOUNT`, and `LINKWE_ANALYTICS_SHEETS_TAB_IDS`. Their private resource identifiers and verification evidence are retained outside the public repository. Never place credentials, private workbook links, Google tokens or imported source records in this document or client bundles. Production release and verification were separately authorized; the final live result is recorded in the private release evidence.

The adapter requests only `https://www.googleapis.com/auth/spreadsheets.readonly` for its short-lived impersonated access token. It does not need Meta credentials, Apps Script edits, an anonymous Sheet publication or a new push endpoint. [Vercel GCP OIDC](https://vercel.com/docs/oidc/gcp)

## Verified source contract

The separate importer handoff is `meta-importer/analytics-data-contract.json`, version verified 13 October 2026. Headers are row 4 and data starts at row 5. Match exact sheet IDs and headers before using any rows; reject schema drift instead of guessing column positions.

| Tab | ID configuration key | Reviewed columns | Grain |
| --- | --- | --- | --- |
| Website Daily | website | A:R | Date, property and channel |
| Organic Posts | posts | A:V | Latest lifetime snapshot per post |
| Organic Accounts | accounts | A:P | Account snapshot |
| Paid Ads | ads | A:V | Ad, day, timezone, currency, attribution |
| Google Business Monthly | gbp | A:O | Profile, complete month and metric |
| Refresh Log | refresh | A:L | Import run and queried coverage |

Do not load Strategy Decisions for analytics evidence. Freeform Notes, updater identities, raw Refresh Log errors and private Gmail report links must not enter client payloads or Rex context. No current external metric figures are hardcoded into this implementation.

Use typed effective values, not locale-formatted strings. Normalize Sheets serial dates from 1899-12-30; preserve source timezone and unknown timezone. Blank cells become null, while numeric zero remains an observed zero. Preserve account and ad IDs as strings. Deduplicate natural keys, keep the latest compatible snapshot and reject conflicting duplicate observations. Do not silently truncate at the handoff's example row bound; establish a bounded complete read and detect overflow before claiming coverage.

Shared UI/Rex definitions are in `lib/analytics/source-definitions.ts`: never sum unique users, daily reach or follower snapshots; distinguish lifetime post cohorts from activity dates; keep currencies separate; compute ratios from compatible complete sums; do not prorate monthly GBP. LinkWe account creation is not attributed activation. Undefined conversions and revenue cannot produce ROAS.

## Adapter acceptance criteria

1. Authenticate the current ADMIN before reading either the cache or the Sheet. No vendor/public action or public cache may expose these aggregates. Filter and source inputs cannot select arbitrary workbooks or ranges.
2. Normalize and validate the exact contract server-side. Build one typed aggregate snapshot used by the UI, CSV and Rex, including requested and covered periods, source timezone, extraction timestamp, completeness, last successful refresh and independently verified refresh mode.
3. Keep source extraction age distinct from dashboard query/cache age. A successful refresh-log row does not establish automatic refresh, complete history or freshness of every retained row. The current separate GA importer is automated; the Meta import was manual and GBP is historical. Reverify those operating states when enabling a live feed.
4. Missing/unreadable/schema-invalid sources remain unavailable. A stale previously verified snapshot may be shown only with its age and a clear last-refresh failure. Never zero-fill missing dates or infer deleted campaigns from absent rows.
5. Test duplicate/conflicting keys, Sheets date serials, null versus zero, mixed currencies/timezones, incomplete windows, nonadditive users/reach/followers, weighted ratios, post cohorts, monthly boundaries, rejected PII/freeform fields, failed refreshes and role denial. Reconcile an agreed date window against the private workbook before release.

## Implemented local adapter

`lib/analytics/sheet-reader.ts` authenticates the current ADMIN before configuration, cache or network access. It uses a runtime Vercel request OIDC token (environment fallback), Google STS and service-account impersonation with a 900-second `spreadsheets.readonly` access token. No token is returned to a client or stored in the data cache. Fixed Google endpoints, redirect rejection, eight-second request timeouts and 4 MiB response limits bound transport. The current design uses the default Vercel token audience; the Google provider explicitly accepts the verified audience and restricts the exact production project/environment subject. Custom token audiences/token-file providers are not implemented. [Vercel runtime token documentation](https://vercel.com/docs/oidc/reference)

Server-only variables are `LINKWE_ANALYTICS_SHEETS_ENABLED=true`, `LINKWE_ANALYTICS_SHEETS_ID`, `LINKWE_ANALYTICS_GOOGLE_AUDIENCE` (the `//iam.googleapis.com/projects/.../providers/...` STS audience), and `LINKWE_ANALYTICS_GOOGLE_SERVICE_ACCOUNT`, and `LINKWE_ANALYTICS_SHEETS_TAB_IDS`. These settings are limited to the approved production environment. With the enable flag absent, no external request is made and no external figures are displayed.

The first Sheets read verifies tab IDs, exact headers and grid dimensions; the second requests only whitelisted structured columns and repeats schema checks. More than 10,000 allocated rows, grid growth during a read, formulas/errors in requested fields and conflicting natural keys fail closed. Concurrent cell edits within unchanged grid dimensions are not a transactional Sheet snapshot; use an agreed stable import window for live reconciliation. Calendar dates accept typed serials or ISO dates; exact extraction/snapshot instants require ISO timestamps with an explicit offset. Native datetime serials must be reconciled against workbook timezone before support is added, rather than guessed.

`sheet-normalize.ts` produces the shared typed snapshot used by the existing Acquisition and Social & ads panels, source health, CSV and Rex. It records requested/observed periods, source timezone, oldest/newest extraction, observed-date coverage, read/cache time and sanitized refresh-log status. It never claims that a successful importer log establishes automation or complete account/channel coverage. Daily first/last partial source days are excluded. Compatible ratios require every full requested date to have an observation and all inputs; the totals still describe observed rows only. Meta account labels can change without duplicating the stable account ID.

The cache retains verified data for 15 minutes. A failed refresh may show that prior snapshot for at most another 15 minutes, explicitly marked stale with its original extraction/read times. Beyond that it returns unavailable. Empty sources, schema drift and missing values are not converted to zero. No financial records, schema migration or model calls were introduced.

`node scripts/test-analytics-sheets.cjs` runs 22 synthetic reconciliation/security/rendering tests and forbids live network reads. Authorization is also covered by the existing local database and compiled HTTP suites. A real authorized server read and reconciliation against the workbook have **not** happened; post-deployment reconciliation is required before claiming verified live figures.

The optional private Google report navigation URL is held separately in `LINKWE_ANALYTICS_PRIVATE_REPORT_URL`, as production-only sensitive server configuration. Only an authenticated ADMIN receives the validated Google report link. Missing or unsafe configuration renders no link.

`LINKWE_ANALYTICS_SHEETS_TAB_IDS` is a private server JSON map from the six source keys above to their exact verified numeric tab IDs. All keys must be present with distinct nonnegative integer IDs. The runtime validates both configured IDs and exact headers before using source rows.
