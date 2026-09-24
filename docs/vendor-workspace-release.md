# Vendor workspace production release — 23 September 2026

Approved request: publish the redesigned vendor dashboard and page repairs.

Based on production commit `e3168baa6eda8b223317475759ec2ffd2490c7f3`. The release contains the vendor overview, responsive workspace navigation, searchable tools menu, setup checklist presentation, scoped error recovery, Shipping information page and Rex access correction. Existing Photo Studio, public marketplace, admin, payment processing, subscription allowances and database migrations are retained from production.

- Shared desktop/mobile navigation exposes all 21 vendor destinations, with quick creation and Photo Studio access.
- Overview uses real store-scoped catalogue, order, booking, request and analytics data. It retains verification, bank details and publishing controls.
- Page errors retain the vendor navigation and offer a server retry.
- Shipping opens a useful fulfilment page rather than redirecting to Overview; the existing LinkWe delivery policy is unchanged.
- Rex page and floating entry recognize remaining Starter lifetime prompts and purchased credits. Existing server usage enforcement remains unchanged.

Local verification covered all 21 navigation destinations, product/service Orders views, Starter plan restrictions, Photo Studio availability and Rex's remaining prompts without consuming credits. Mobile Orders, Requests and Shipping loaded without horizontal overflow at 390px; the redesigned workspace was also checked at 320px and desktop widths. Local empty order fixtures do not exercise payment or fulfilment mutations.

Release validation passed: scoped ESLint, git whitespace check, and the full optimized Next.js production build with TypeScript and all 108 static pages. The compiled release was then run against the local fixture database; Overview, Orders, Requests, Subscribers and Shipping rendered successfully. No payment, image-generation or customer-data mutations were performed during verification.

Deployment outcome is recorded after completion in the working project release notes.
