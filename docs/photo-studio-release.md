# Photo Studio production release — 23 September 2026

Requested: publish Photo Studio, restrict continuing access to Growth/Pro, give Starter five free edits, add zoom and crop.

Release based on live commit `6c064fa45b965aef234a149eed16cad31a71cd65`, isolated in `/private/tmp/linkwe-photo-studio-release`. It includes only the studio, vendor navigation, new/edit product upload integration, image-processing dependency, focused checks and documentation. No database migration, payments change, preview route or test images are shipped.

- Active Growth/Pro subscriptions receive continuing access within usage limits. Expired/inactive subscriptions fall back to the remaining trial allowance.
- Five lifetime trial edits per vendor owner; refresh, month rollover, plan changes and store recreation do not replenish the allowance. Test and live allowances are separate.
- Server transactions reserve credits atomically. Failed processing refunds the vendor's trial credit; global cost guards still count attempts. Abandoned reservations recover after ten minutes. Successful photo results count once; local tuning/cropping/zoom do not count again.
- Lighting, warmth, straightening, square crop with positioning, and a 100–400% inspection dialog. Reset/crop restoration works without provider calls. The exact rendered file is used for download/product insertion after confirmation.
- Photoroom's existing free trial has ten live images available. Initial production configuration caps usage at ten attempts total, ten per month and ten per store/day. The total cap does not reset. No paid plan or automatic overage is enabled. Raising this limit requires a separate budget decision.
- Credential is server-only, stored as a Vercel production secret. Local development continues using the watermarked sandbox. No key is included in git or browser assets.

Validation: TypeScript, focused lint, eight mocked API checks, pixel/crop/rotation checks, real loopback-database quota/race/refund/recovery tests, desktop and 390px browser crop/zoom/reset checks. Full optimized production build passed with production Prisma types and all 108 static pages. Local email configuration used a dummy placeholder; no emails were sent. Deployment results will be appended after completion.

## Published and verified

Commit `e3168ba` was pushed to `origin/main`. Vercel deployment `dpl_57beKVvnrHY3Hk33v3ppaKiMZn8t` reached Ready and is assigned to `www.linkweonlinemall.com`. Deployment URL: https://linkwe-ai-pi3tays8p-link-we-online-mall-s-projects.vercel.app

The live API returns HTTP 401 with private/no-store caching to unsigned requests. The signed-in production Admin session redirects out of the vendor workspace, as expected. A production vendor upload was not performed because no vendor session was available; no real vendor records or trial credits were changed by verification. Real provider processing had previously passed sandbox checks. Deployment verification consumed no live image credits.

Production server configuration includes the live Photoroom key and explicit 10-image lifetime/monthly caps; local configuration remains sandbox. No subscription was purchased. Temporary release dependencies/build output were removed after the successful build to recover disk space. The release source and commit are retained.
