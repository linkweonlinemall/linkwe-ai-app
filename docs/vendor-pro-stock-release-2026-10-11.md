# Pro live stock update release — 11 October 2026

Adds an inventory-only catalog workspace for quantities sold outside LinkWe. Vendors search/filter products, select exact variants, explicitly add each quantity, review a batch and confirm one stock reduction. Existing product labels from QR Studio can identify a product; variants still require an explicit option choice. The scanner uses an explicit camera permission request and stops after one capture. Repeated frames or rescans never increase a quantity. Paste/search remains available.

## Pro-only boundary

The user authorized production publication only for Pro users. The existing plan model contains STARTER (free), SERVICES, GROWTH and PRO; Pro is the highest tier. This feature requires PRO plus ACTIVE status and a future renewal date when one is set, matching the existing paid Photo Studio rule. Active legacy Pro records with a null renewal date remain eligible. Lower tiers, inactive, expired and unknown plans are denied.

The page gates before loading stock data or history; Creation Zone offers an upgrade path to Finance, and dashboard navigation labels the feature Pro. Catalog refresh, QR resolution and final stock submission enforce the server's current plan, session and store ownership. The transaction checks entitlement before mutation or idempotent replay. A downgrade preserves any uncertain pending request so renewal and retry cannot deduct twice. Existing ordinary product management, stock editing, QR Studio labels, prices and subscription records are unchanged.

## Inventory and database behavior

Every selected variant is resolved within an owned physical product. The batch deducts finite variant stock and finite shared product stock consistently; null remains unlimited. Positive whole quantities, maximums and combined shared stock are validated. A serializable transaction, conditional decrements, bounded retries and a store-scoped idempotency key prevent over-deduction and duplicate commits. Receipts record inventory before/after snapshots and the actor. No orders, invoices, payments or financial sales are created.

The only new migration, `20261011010000_vendor_stock_adjustments`, adds `stock_adjustments`, its store foreign key, positive-total constraint, unique request index and history index. It does not change any existing stock or financial data. The established production build runs `prisma migrate deploy` before compilation; postinstall regenerates the Prisma client. The actual migration was exercised in a disposable loopback test schema.

## Release isolation and validation

The release starts from verified production `f5d0a48f92e0e53d845e2ab7a8b0f44e680d93bf`. All pre-existing files changed by this feature matched that production baseline before applying the patch. Only the feature's 26 implementation/documentation/test files plus this release note are included. Unrelated dirty work, local seed/preview launchers, environment files and generated artifacts are excluded. No browser or GUI was used for this release work.

The production-based checkout passed 15 QR/entitlement/lifecycle checks, 13 staging checks, 32 real inventory integration checks, scoped ESLint, whitespace checks, full TypeScript and the optimized Next.js build. Five compiled HTTP checks confirm authenticated Pro access, anonymous/non-vendor denial, Free upgrade UI with no stock data, direct Free action/QR denial, continued ordinary product management, owned QR lookup without mutation and one receipt for concurrent final submits. All integration/HTTP fixtures were confined to the disposable local database and cleaned up. Production checks are read-only; the user will perform any live stock deductions.

## Operational limits and rollback

Camera scanning needs a supported browser camera API, HTTPS, an available camera and user permission. Internet is required for lookup and final confirmation; adjustments are not queued offline. Physical phone-camera and visual review remain for the user; no device-version compatibility claim is made. Authenticated ownership/plan scenarios were tested against the compiled release locally, not by impersonating production vendors.

An application rollback can restore the previous deployment (`dpl_4VfkyU6bdUsvZyQey6eZ6CMDAukH`) without dropping the additive audit table. Retain its receipts and migration history. Rolling back application code must not automatically restore stock: any live deductions already confirmed by vendors remain real inventory changes and would need a separately reviewed correction. Published commit, deployment, migration evidence and live health results are recorded with the task's release evidence.
