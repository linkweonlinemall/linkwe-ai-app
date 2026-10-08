# Analytics and Rex release — 8 October 2026

Adds an administrator analytics workspace with plain-language definitions, date/device/source controls, visitor journeys, confirmed live payment and settlement metrics, vendor progress, business activity, campaign links and CSV export. Rex receives the authorized report and can assess, suggest, filter, navigate report sections, refresh, export and prepare campaign links through the same page controls.

## Release boundaries

Starts from production commit `027163937bcc9f9fd7609a1cd8c46e4ce7a51f69`. The additive migration creates three analytics tables and supporting indexes, and adds a nullable payment-environment field. No existing business data is deleted or reclassified. The existing production build applies migrations before compilation. No new packages or production credentials are required.

Visitor collection requires consent, excludes private routes and known administrator/courier activity, and retains visitor events and checkout attribution for 180 days. Financial totals use verified live payment records; unclassified legacy payments are reported as a coverage gap. Device/source filters apply to visitor reports, not business totals. Historical Google Analytics reports and advertising costs are not connected.

Unrelated local changes, generated images, development fixtures, environment files and uploads are excluded. The local migration helper refuses non-loopback databases.

## Verification

The production-based release passed 10 analytics integration checks against the loopback development database, 19 Studio/Rex checks with simulated AI/email providers, two checkout checks, scoped ESLint, whitespace checks, TypeScript and the optimized Next.js build (117 static pages). A transient Google Fonts loader failure cleared on retry without code changes.

The implementation was also checked in the local browser on desktop and a 390-pixel phone viewport. Rex successfully changed filters, navigated report sections, assessed available data and generated campaign links. Export contents were checked programmatically; the in-app browser download event could not be captured. No real payments or outbound customer communications were created for verification.

## Publication

The user explicitly requested publication. Deployment identity and live verification results are recorded separately with the release evidence after publication.
