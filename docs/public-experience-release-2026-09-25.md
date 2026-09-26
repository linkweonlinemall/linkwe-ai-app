# Public experience and workspace release — 25 September 2026

User authorised publishing after adding the feature directory and updating pricing, checkout, policies and navigation. Release assembled against production commit `9e7f9d771953018eccff115283de01ff49e32bb6` in an isolated checkout.

## Included

- Searchable `/features` directory grouped by shopping, business operations, growth tools and support. Links appear in the public menu and footer.
- Pricing redesigned around the application's configured prices, commission and listing/Rex limits. Current-plan management, new-business plan selection, upgrade links and support-assisted downgrades are explicit. Unimplemented TT$100 services-only package is not offered.
- Checkout redesigned with details, order review and WiPay payment stages; delivery/pickup eligibility considers every physical item and ignores digital items; custom questions, uploads, coupons and selected variants remain supported. Failed quotes can be retried. Provider/network errors recover gracefully. Expected totals are checked on the server before a payment is initiated.
- Shared public slide menu with native-dialog focus handling, Escape dismissal, role-aware dashboard access and customer/help shortcuts. Refreshed mobile bottom navigation and footer.
- Coherent help/legal layouts; updated Terms, Privacy, Shipping, Returns, FAQ, About and Contact. Added `/cookies`. Content covers existing pay-on-arrival eligibility, direct-payment refunds, ID deferral, supported AI operations, collaboration limitations and browser storage. Existing operator identity and support address preserved; unsupported response-time and placement promises removed.
- All previously completed workspace and login/onboarding changes described in `website-upgrades-2026-09-25.md` and `login-onboarding-redesign-2026-09-25.md` are included.

## Release boundaries

Production data loaders, prior releases, schema, migrations, dependencies and environment configuration remain based on current main. Local preview routes, fixture snapshots, test credentials, private files and unrelated marketing work are excluded. No new migration or environment variable is required. Photoroom account payment and the upgrade announcement video remain deferred. The TT$100 services package remains a proposal, pending its allowance/access decisions and billing implementation.

## Verification

- Optimized production build and TypeScript passed for the isolated release.
- Targeted lint passed with one native-image optimisation warning; whitespace checks passed.
- `scripts/test-public-release.cjs` passed: fulfilment options and pricing destinations; transaction-backed checkout totals/eligibility and ownership; onboarding/ID skip; workspace QR/tutorial/customer checks; Rex permissions/streaming; staff/review/collaboration/store actions; coupon pricing and fulfilment; image-provider mocks and quota concurrency. Local DB writes rolled back and external payment, AI, upload and notification providers were simulated.
- Browser checks: desktop and 390px menus, Escape focus return, feature search/category filtering, responsive pricing, mobile order-summary expansion, pickup review, delivery address/phone and combined quote, Back to edit, and compiled checkout review. No real payment submitted. Existing local OneSignal production-domain warning does not affect these UI checks.

Policy references reviewed: [Consumer Affairs redress](https://consumeraffairs.gov.tt/services/redress/), [TTCSIRT privacy guidance](https://ttcsirt.gov.tt/data-protection/), and the official Trinidad and Tobago Laws library's Data Protection Act proclamation information. Changes describe actual platform behaviour and retain mandatory-rights qualifications.

## Publication

Deployment status and production commit will be recorded after publishing and verification.
