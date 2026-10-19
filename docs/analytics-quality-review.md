# Analytics quality review

This release is based on `05c021b8635360ac5c282587e3af8b3c6d04e1dd`, prepared on branch `codex/analytics-quality-2026-10-15`. Publication of the reviewed dashboard fixes was approved with the new vendor milestone collection disabled. No migration, new credentials, scopes, sharing changes or paid model calls are required.

## What changes

- GA additive measures retain valid numeric observations when another row is blank. Each measure carries observed/blank/total row counts and `observed`, `partial` or `unavailable` quality. No numeric observations means unavailable; observed zero remains zero with its coverage label. Invalid values, unsafe sums and conflicting rows still fail closed.
- Daily groups list missing source-calendar dates. Dates with some rows do not prove every channel/account is present. Partial source days are excluded as before. Rates remain unavailable when required inputs or dates are missing.
- Meta refresh logs support semicolon-separated exact destination titles. Malformed rows are skipped individually; partial runs have their own status; conflicting timestamps cannot manufacture success. Importer success does not establish automation or complete/fresh cells.
- Ad observations are grouped separately by exact ad ID and attribution setting. The administrator UI, CSV and Rex evidence include verified string IDs and attribution text. Raw report links, notes, updater names and credentials remain excluded. Full-period unique reach/frequency, video, audience and placement reports are still unavailable until separate verified structured reports exist. Daily reach is never summed.
- Source health explicitly distinguishes unavailable Facebook Page insights and an unconnected Pinterest source. Dashboard, CSV and Rex share coverage metadata.

## Source investigation

The targeted source-note inspection explained the blank GA metric row: the latest query returned no date/channel row, so the importer cleared older values to avoid stale attribution. Absent dates also remain unknown. A successful run records execution, not completeness. No workbook cells were repaired, filled with zero or re-imported by this change. Private dated reconciliation evidence stays outside the repository.

## Future vendor conversion collection

Existing public-page activity requires accepted analytics consent and a signed first-party session. It excludes administrator/courier activity and private paths. The current client `sign_up` signal relies on a success query parameter reaching an eligible public page; business onboarding redirects to excluded private paths. Existing account creation totals include imports and administrator-created users, and setup totals describe current store state. Neither establishes self-service conversion or ad attribution.

New server-only groundwork records `vendor_signup_confirmed` after successful self-service business registration (email or new Google account) and `vendor_setup_confirmed` after the initial successful setup save. Returning Google login, customer signup, imported accounts, failed writes and setup replays do not invoke those hooks. The collector checks current session ownership and an active vendor role, runtime eligibility, consent and signed context. Setup also requires a saved owned store. Best-effort measurement cannot block business operations.

Collection is **off by default** behind `LINKWE_ANALYTICS_VENDOR_MILESTONES_ENABLED=true`. No live flag is changed. It writes only to the existing first-party analytics table, with HMAC receipt deduplication and existing 180-day retention. Raw account/store identifiers, names, email, form contents and private paths are not stored in the event payload. Browser ingestion rejects the reserved event names. It creates no account join table, advertising identifier or third-party transmission. Context is the consented session's landing source, not verified ad-platform attribution. A receipt can recur after retention or signing-key rotation; this is not lifetime attribution.

Before enabling: explicitly approve this collection purpose and retention, confirm privacy/consent text covers vendor signup/setup measurement, then approve the server flag and deployment separately. Add a separately labelled observed-milestone report before presenting results; do not merge them with all-account signup totals or treat them as a complete funnel. The groundwork does not yet expose milestone counts in the dashboard. Define an ordered, consented cohort and a compatible denominator before calculating conversion rates. Do not backfill guessed acquisition or historical completion times.

Google/Meta transmission, conversion configuration, matching identifiers, persistent grants and any expanded source access require separate approval. No such action is performed here.

## Local review

Use the existing disposable `127.0.0.1:55440/linkwe_analytics_test` database and preview launcher described in `admin-analytics-hub.md`. Never run the package production build/migration command for local testing; use the direct Next build there. The local launcher removes inherited external-reader, OIDC and model credentials.

`test-analytics-sheets.cjs` exercises typed source reconciliation, gaps, refresh logs, identity, privacy and rendered/exported/Rex evidence without network. `test-vendor-milestones.cjs` tests the disabled collector, consent/context absence, actor restrictions, repeats, failures and browser forgery. The existing consent, analytics, hub, onboarding, mocked Rex and compiled HTTP suites verify integrations. The isolated headless suite uses its own Chrome profile, never the shared interactive browser, and can render a synthetic source-quality fixture generated with `ANALYTICS_QUALITY_PREVIEW_DIR=../linkwe-admin-analytics-qa/enhanced node scripts/test-analytics-sheets.cjs`.

Live model answer quality is outside this release. Production verification is recorded separately from the synthetic local checks. Existing source reconciliation is a bounded read, not a proof of all upstream tracking coverage.
