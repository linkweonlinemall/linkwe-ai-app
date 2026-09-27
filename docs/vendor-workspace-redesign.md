# Vendor workspace refresh

Published on 23 September 2026 after approval, in commit `9052a18`. See `docs/vendor-workspace-release.md` for release scope, checks and live verification.

## Experience

- Cream, deep teal and LinkWe orange workspace; responsive store identity and quick actions.
- Shared grouped navigation for daily work, catalogue, brand tools and business operations.
- Searchable, keyboard-accessible native dialog with task descriptions and Command/Ctrl K.
- Mobile bottom navigation and the same complete tools menu, including Photo Studio, shipping, staff, finance and sign out.
- Real counts for orders awaiting action, pending bookings and pending on-demand requests, scoped to the vendor's store.
- Catalogue counts exclude archived products and distinguish services; draft totals include products and services.
- Settled earnings, monthly orders, views and conversion retain the existing analytics calculations.
- Full 30-day chart and accessible daily amounts; UTC date grouping is labelled explicitly.
- Recent orders link to order detail and show actual statuses, including cancelled and completed.
- One profile completion percentage based on all ten existing fields.
- Expandable setup retains email/identity checks, ID/selfie submission, bank forms, publishing and every profile field.
- Availability switch has an accessible name, pending state and recoverable error feedback.

## Data and implementation

The redesign adds no schema migrations, payment rules, subscription allowances or Photo Studio permission changes. The overview reads only the five orders it displays and batches independent server reads.

New files:
- components/vendor/workspace.module.css
- components/vendor/dashboard-navigation.ts
- components/vendor/VendorWorkspaceMenu.tsx
- lib/vendor/workspace-summary.ts

Updated existing vendor shell, sidebar, topbar, mobile navigation, overview, setup checklist, availability switch, dashboard page and dashboard component adapter. Existing product/service/event creation and management routes are retained.

## Verification

- TypeScript whole-project check passed.
- ESLint for all changed TypeScript/TSX files passed.
- Git whitespace check passed.
- Browser: desktop layout, 390px mobile layout, 320px layout with no horizontal overflow.
- Search for photos resolves Photo Studio; complete mobile menu opens and closes.
- Service menu navigation loads the vendor's existing services.
- Topbar Create shows product, service and event actions; Escape closes it.
- Continue setup opens and focuses verification; all bank and document fields remain present.
- Daily earnings disclosure contains 30 rows.

Use the running local vendor session at http://127.0.0.1:3000/dashboard/vendor for review. Local fixture store contains catalogue items but no orders/earnings. No production writes were made.

## Vendor page repair — 23 September 2026

- Orders, Requests and Subscribers were querying fields absent from the local `linkwe_dev` database. Applied the four existing pending migrations (business-post attachments/search tags, service payment safety and subscription lifecycle) after backing up the local database. No production database changes.
- Local backup: `/private/tmp/linkwe-dev-before-vendor-repair-1790216833136.dump`.
- Restarted the stalled development server and cleared its rebuildable Turbopack cache after disk pressure.
- Added a vendor page error boundary with a server retry, so a page failure retains workspace navigation instead of falling through to the global reconnect loop.
- Shipping previously redirected to Overview. It now explains the existing LinkWe-managed fulfilment flow and links directly to orders, product delivery details, store policies and delivery information. It does not expose unsupported custom rates.
- Rex's page and floating entry now respect the existing Starter lifetime prompts through `getAIUsageState`. Paid-plan access and purchased credits remain supported; usage enforcement and allowances are unchanged.
- Browser audit: all 21 workspace links checked. Product and service Orders, Requests, Bookings, Subscribers, Messages, Products, Services, Events, Storefront, QR Studio, Finance, Reports, Reviews, Staff/availability, Collaborations, Settings and Overview loaded. Timeline showed the expected Growth/Pro restriction for the Starter fixture. Photo Studio resolved its availability check and displayed 5 trial edits. Rex displayed 5 available prompts without submitting a paid generation.
- Shipping, Requests and Orders checked at 390px with no horizontal overflow; the Orders bottom-navigation link loaded the correct page. Viewport override reset afterward.
- Whole-project TypeScript, lint for repair files, and whitespace checks passed. Empty order/subscriber fixtures verify page loading, not payment or fulfilment mutations.
