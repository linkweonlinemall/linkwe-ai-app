# Customer shopping and vendor Service Desk release

Approved 25 September 2026: publish all completed pending customer shopping and Service Desk work.

Production base: `905132dd4c839e990b355a87eec98ae086c48849`.

Includes customer Orders, order details, Cart, Bookings, Tickets and entry-pass pages; selected-option cart/checkout/coupon pricing corrections; ticket entry access guards; and the unified vendor Service Desk with bookings, requests, quotes and subscriptions. Existing public marketplace, admin, Photo Studio and Creation Zone releases are preserved. Local preview routes, fixture data, credentials and unrelated files are excluded.

No schema migrations, dependency upgrades or new environment variables are needed.

## Release verification

- Exact isolated release passed optimized Next.js build and TypeScript.
- Focused lint passed with native-image optimization warnings only; whitespace check passed.
- Customer shopping, experiences, ticket-PDF and Service Desk workflow checks passed.
- Customer shopping, Service Desk and coupon integration checks passed on local `linkwe_dev`, with all database writes rolled back and external providers stubbed.
- Compiled vendor Service Desk rendered the combined booking, quote and subscription fixtures. Compiled customer Orders, Cart, Bookings and Tickets pages rendered successfully.
- Desktop and 390px/320px layouts and record-review controls were checked before release. No production purchases, notifications, refunds, transfers or customer record mutations were performed for verification.
