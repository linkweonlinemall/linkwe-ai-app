# Complete website release — 26 September 2026

The user authorised publishing all completed website work. This release is assembled on production commit `292704c3966ce5535d4d126a912dbdbcc95b0bed`, preserving the earlier login, onboarding, checkout, legal, vendor workspace and customer dashboard releases.

## Included

- Rex blue and orange accents, orange homepage ribbon, shared categories, upgraded search suggestions and results, directory/storefront filters and product colour swatches.
- Redesigned Rex, usage percentage display, Timeline, customer messaging, saved stores, wishlist, invoices, vendor reports/settings and guided tutorials.
- TT$100/month Services plan with 20 services, Starter-level access elsewhere and no service price ceiling; supported pay-on-arrival workflows, clearer service details and vendor support tickets.
- Notifications centre and dropdown, shopping-bag drawer and device-aware app installation guidance.

See `rex-blue-upgrade-2026-09-26.md` and `discovery-and-swatches-2026-09-26.md` for user-facing descriptions and feature boundaries. The promotional video and paid Photoroom account setup remain deferred.

## Database and release boundaries

The production build applies three additive migrations: Services enum value, vendor support tables/indexes and optional service-detail columns. No existing records are deleted or rewritten. Existing production configuration and provider credentials are retained; no new environment variable is required.

Local preview routes, newly added directory fixture fallbacks, test accounts, local uploads, private identity files, temporary artifacts and credentials are excluded. Production catalogue loaders use the live database.

## Validation

- Isolated optimized production build and TypeScript passed (114 static pages).
- Isolated discovery and Rex/Services release suites passed: search/filter matching, notification ownership/read snapshots, plan limits and billing, duplicate payment callbacks, support ownership/status rules, Timeline pagination and customer inbox protection.
- The full local public-release suite and desktop/mobile browser checks passed before assembly. Provider calls were simulated and integration writes rolled back.
- Whitespace and release file inventory checks passed; only application code/assets, migrations, regression tests and release documentation are included.

Native app installation needs a supported device/browser; the embedded browser can verify guidance but cannot complete native installation.

## Publication

Prepared for production publication to `origin/main` through the existing Vercel integration. Final deployment details are recorded in the task after Vercel reports Ready and the live checks pass.
