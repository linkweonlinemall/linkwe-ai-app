# Admin management upgrade

Approved for production by the user on 22 September 2026. This admin-only release is based on production commit `7ba4e61`; the existing production schema, migrations, public marketplace and payment lifecycle are retained.

## Staff workflow

- Overview prioritises daily activity, approvals, fulfilment and quick creation.
- Creation Studio separates new records, finding existing records, guided vendor setup and CSV import.
- Stores, products, services, people and specialist listings share a sectioned editor with save feedback, validation, linked records, an unsaved-change warning and protection against overwriting another staff member's changes.
- Media supports uploading, previewing and reordering. Store hours, checkout questions, social links, product variations and vendor bank details have structured controls.
- Service settings adapt to appointments, quotes, subscriptions, on-demand and virtual services. Payment rules follow the existing vendor plan policy.
- People includes inactive and suspended accounts. Vendor and customer screens link directly to account editors.
- Orders and ticket orders have search and pagination. Mobile vendor records, ticket orders and specialist listings no longer depend on wide desktop tables.
- All existing operational workspaces remain accessible: warehouse and CSF, orders, tickets, payouts, verification, conversations, settings and Test Lab. The staff guide explains the new workflows.

## Local verification

- Production build and TypeScript validation passed in an isolated checkout using the production Prisma schema. All 23 integration checks also passed in that checkout against loopback-only test data.
- Scoped lint: no errors; three image-optimisation advisories remain for staff previews of vendor media.
- The local integration suite exercises real database transactions with mocked session/cache adapters. It rejects non-loopback databases and removes its own generated records.
- Checks cover creation, partial-save preservation, stale-edit rejection, product variation identity, service scheduling/deposits/subscriptions, payment policy, bank profiles, role protection, search, archive filtering, pagination, guided vendor setup, CSV retry and transactional rollback.
- Browser checks used the normal local login. Store and service edits saved successfully; product creation opened the new record. Mobile search, navigation, order pagination and cross-page order search worked.
- Layouts were inspected at 390 px and 1440 px. Settings, people, vendors, messages, verification, listings, tickets and the main editors were checked at phone width.

## Review boundaries

The local preview includes clearly labelled sample records. Production records were not edited. Payments, refunds, payouts, emails, CSF bookings and external image uploads were not executed during validation; their existing external integrations require a controlled staging check before release. The production-only OneSignal configuration reports a localhost warning in development.

The change reuses the existing ADMIN access model. It does not introduce granular staff permission roles, schema migrations or a new financial workflow.

## Developer commands

Run `node scripts/admin-preview-fixtures.mjs` only against a loopback development database to prepare sample records. Run `node scripts/test-admin-records.cjs` for the integration checks. Use `npx next build` for compilation without the deployment script's migration step.
