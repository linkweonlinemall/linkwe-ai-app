# Vendor Creation Zone

Implementation and release preparation, 25 September 2026.

## Workspace

The vendor navigation now opens `/dashboard/vendor/creation`. Products, services, events and ticket tiers share one searchable library with type/status filters, sorting, grid/list layouts, pagination, and supported bulk actions. The original full product, service, event and ticket fields remain available within a shared editor and section navigator. Old management URLs redirect to the new routes. Event attendees, check-in, service availability and subscriber operations remain accessible.

Creation forms save explicitly; they do not autosave. Product/service archive is reversible. Publication continues to use ownership checks and existing eligibility/plan validation. A draft store remains unavailable for public purchase.

## Coupons

`/dashboard/vendor/creation/coupons` supports percentage or fixed TTD discounts, eligible minimum spend, expiry at the end of the selected Trinidad & Tobago day, and pause/reactivate/edit. Coverage can be:

- All products, all service types, and/or all events and tickets, including future creations.
- One or several selected products or services.
- Individual ticket tiers.
- Whole events, including future tiers of that event.

The server validates every selected creation belongs to the vendor. Empty restricted selections are rejected. Changing to all eligible creations clears the target list. New coupons have unlimited redemptions; no redemption-count or per-customer limits are offered.

In mixed carts or ticket purchases, only eligible lines receive discounts. Only those lines count toward a minimum spend. Discounts are allocated in exact minor units, preserving quantity and payment/refund totals. Delivery is not discounted. Product fulfilment uses the original catalogue price when creating legacy listing records and the discounted paid amount for vendor order splits.

Service coupons cover bookings, accepted on-demand quotes and the first service-subscription checkout. Subscription renewals retain their normal price. Deposits cannot exceed the discounted total; quote retries use the original quote to avoid compounding a discount. Fully discounted purchases use the existing free fulfilment paths instead of sending zero charges to the payment provider.

Existing event-only promo codes keep their existing usage limits and take priority if they share a code with a store coupon. Store coupon restrictions are rechecked at checkout. Historical order snapshots remain unchanged when a coupon is edited or paused.

## Database / deployment

Four migrations are included in the isolated release, together with Prisma client generation. The service lifecycle prerequisites are needed by the updated order workflows and coupon checkout:

- `20260912120000_service_payment_safety`: payment expiry/claim fields and on-demand completion accounting; completed legacy requests are marked already released to avoid duplicate payouts.
- `20260912150000_subscription_lifecycle`: subscription session, pause and trial fields, with existing subscriptions backfilled from their service settings.
- `20260925000000_creation_zone_coupons`: store coupon table and order/booking/request/ticket snapshots.
- `20260925010000_coupon_targets`: optional creation target keys; an empty array preserves unrestricted scope behavior.

The migrations were validated on local `linkwe_dev`. Verification did not make real payment requests or send notifications. The isolated release starts from production commit `9052a18` and preserves existing public designs, admin pages, Photo Studio, dependencies and upload exclusions. Production deployment applies migrations through the existing Vercel build command before building the application.

Successful payment callbacks validate the stored coupon snapshot for an initial service-subscription charge, including discounted trial periods. A later coupon edit or pause does not invalidate an accepted checkout. Renewals still require the regular subscription price. Callback retries are idempotent.

## Verification

- TypeScript check passed.
- Targeted ESLint passed without errors; one existing image-element warning remains in the moved service creation form.
- Production build passed.
- `scripts/test-creation-coupons.cjs`: money allocation, quantities, retry bases, library filters/status and preservation of every original named editor field.
- `scripts/test-creation-coupon-actions.cjs`: database-backed local action tests in a rolled-back transaction. Covers vendor/creation ownership, scopes, expiry/pause/minimums, products, service bookings/quotes/subscriptions, ticket tiers, event-wide offers, mixed purchases, exact payment/refund totals, free fulfilment and archive/restore. Also verifies discounted subscription callbacks and trials, paused coupon snapshots, repeat callbacks, mismatched amounts and regular-price renewals. Payment and notification providers are stubbed.
- Browser checks: product draft creation, service editor conditions, event draft and ticket-tier creation, coupon creation and saved single-product selection, desktop and mobile layouts. Coupon picker at 390px has no horizontal overflow; Creation Zone/service editor previously checked at 320px and 390px.

Local preview data includes draft product `Island essentials · Creation Zone preview`, general coupon `PREVIEW15`, and single-product coupon `PREVIEWONE`. An event draft `Island makers evening · Preview` with `Early bird · Preview` ticket tier was also saved. These belong to the local preview store only.
