# Vendor Service Desk

Vendor workspace: `/dashboard/vendor/service-desk`. Release prepared 25 September 2026 with the customer shopping upgrades.

## Workspace

- Bookings, on-demand requests, quote requests and service subscriptions share one searchable workspace.
- Filters cover record type, service, work queue and sorting. Attention, upcoming appointments, active plans and customer responses have quick-access counts.
- The appointment calendar uses Trinidad & Tobago dates and times, with weekly navigation and a date picker.
- Detail panels include customer contact, service links, scheduling, notes, payments and available next steps. On phones, details move above the list while dashboard navigation stays fixed.
- Booking tools include separate private notes, customer meeting links, calendar export, confirmation, reasoned cancellation and eligible no-show handling. Bulk confirmation/cancellation reviews the selected appointments before updating.
- Requests include the customer brief, photos, directions, offer/response controls and work-delivered confirmation.
- Subscriptions show price, interval, access dates, pause/cancellation terms, remaining sessions and the latest 20 session records. Eligible completed sessions can be recorded; customers continue managing their own renewal, pause and cancellation.
- On-demand availability and staff working hours remain accessible on desktop and phones.

## Integration and safeguards

The sidebar and dashboard shortcuts use Service Desk. Existing bookings, requests and subscribers URLs redirect to the corresponding view, retaining supported record links. Relevant mutations revalidate the new workspace.

Queries and private-note/cancellation actions require vendor authentication and store ownership. Existing booking, request, subscription and refund actions remain authoritative. Private team notes are not used as customer cancellation reasons. Payments, customer notifications and customer-controlled completion rules retain their existing behavior.

## Verification — 25 September 2026

- Production build passed. Type checking passed again after the final scoped mobile scrolling adjustment.
- Focused lint passed with two native-image optimization warnings and no errors.
- `node scripts/test-vendor-service-desk.cjs` passed: search, queues, statuses, dates, recurring estimates, session eligibility and action isolation.
- `node scripts/test-vendor-service-desk-actions.cjs` passed against the local development database: ownership, serialization, private notes and session deductions/denials. Database writes were rolled back; external notifications and provider calls were stubbed.
- Browser checks covered desktop and 390px/320px phone layouts, search, attention filters, weekly calendar navigation, booking details, quote/session review screens and the legacy booking redirect. No customer-facing mutation was submitted during browser testing.

No schema migration is required by Service Desk itself. Other pending workspace changes have separate migration/release requirements.
