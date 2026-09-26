# Website upgrades — 25 September 2026

Continuation of the live release at `9e7f9d7`. Existing uncommitted work must be preserved.

## User decisions

- Defer the feature video until the website tasks are finished.
- Photoroom purchase/account setup is being handled separately by the owner; skip it.
- Reduce the Starter Photo Studio lifetime trial from five images to one. Previous usage remains counted.
- Discuss a services-focused package at **TT$100 per month**, with customers paying providers on arrival. Prepare the feature/access structure before changing billing.

## Completed locally

- [x] Top-right Create menu: consistent rows for products, services, events, tickets and coupons, with a separate Creation Zone footer. Checked on desktop and at 390px wide.
- [x] Starter Photo Studio trial: one lifetime image; historical use remains counted. Provider setup/payment is deferred.
- [x] Tutorials: searchable library, categories, saved progress, pause/resume, refreshed lessons and guidance for unavailable controls. Walkthrough controls remain usable over native schedule dialogs.
- [x] Store creation/editing: live identity preview, suggested web address, clearer sections and save controls, accessible region/hours fields, validation that preserves unsaved entries, preservation of checkout fields and closed days, and rejection of reversed/overlapping hours.
- [x] QR Studio: automatic preview, published content destinations, safe public-LinkWe link validation, three colours, 1200px PNG, SVG and printable cards with escaped text.
- [x] Rex: refreshed workspace and task suggestions, percentage allowance, separately identified top-up reserve, account-scoped service/finance/review/coupon tools, private appointment notes and robust streaming. Sales summaries distinguish gross item value from released earnings.
- [x] Staff and Visibility: service schedules, team profiles, assigned services, working hours, time off, manual booking assignment and public visibility explanations. Assignments enforce ownership, service eligibility, hours and buffer conflicts. This does not yet offer customer-selected staff or automatic team capacity at checkout.
- [x] Shipping: actionable paid physical-order queues, delivery/pickup/preparation filters, direct order links and product delivery-readiness checks.
- [x] Collaborations: incoming/outgoing views, filters, public listing links, duplicate protection, owner-only pending approvals, current publication/sellability checks and reversible closure. Featuring retains the original seller's checkout; it does not create a revenue-sharing agreement.
- [x] Finance: Overview, Transactions, Payouts, Bank details and Plan & Rex navigation; transaction search/pagination; clearer payout prerequisites; separate explanation of pay-on-arrival money.
- [x] Reviews: rating distribution, search/type/rating/unanswered filters, pagination and editable replies, backed by store ownership and input validation.
- [x] Services discussion: see [services-plan-proposal.md](services-plan-proposal.md). TT$100/month and pay on arrival are confirmed. Listing/staff/Rex allowances are proposed; no Services plan has been enabled in billing.
- [x] Customer Dashboard: connected orders, cart, current bookings, usable tickets, requests, subscriptions, messages, updates, saved items/stores and paid digital-order access. Customer pages link back to the dashboard. Today’s bookings, deposit-paid appointments and ticket ownership are handled explicitly.

## Validation

- Production build passed (`npx next build`), including type checking and 110 static pages.
- Final TypeScript check passed; targeted ESLint has no errors (two native-image optimization warnings).
- Photo Studio mocked-provider checks and local-database trial concurrency/refund/recovery checks passed. No paid provider call was made.
- Workspace regression checks passed: public QR destinations, escaping, tutorial progress/storage failure, Trinidad dates, booking/ticket selection, safe links and staff buffers.
- Rex checks passed: role/store isolation, deductions, service data, private-note inputs, sales aggregation and fragmented UTF-8 streaming. No AI charge was incurred.
- Local database action checks passed: review filtering/replies, staff services/schedules/time off/assignment conflicts, collaboration request/approval/closure, store validation/checkout-field preservation and cross-account ticket protection. All writes rolled back; notification/upload providers were stubbed.
- Existing coupon/editor-field regression checks passed after shared public-content lookup changes.
- Browser checks covered the top-right menu, QR invalid links/colour/export/card generation, tutorial pause/resume and native-dialog controls, store validation with retained entries, shipping filtering, Finance navigation, Rex prompt insertion, Reviews/Collaborations layouts and the populated Customer Dashboard on mobile and desktop. The customer booking round trip was verified.
- Local preview still logs the existing OneSignal production-domain restriction; push delivery was not exercised. An interrupted sign-out/navigation produced a development Router hook error; normal sign-out, customer sign-in, dashboard/bookings navigation and a fresh dashboard reload subsequently completed.
- QR card contents were verified in the print frame. Physical printing and phone-camera scanning were not performed.
- Browser viewport override restored after mobile checks.

## Release and outstanding decisions

These changes are local and uncommitted. This batch has not been deployed. Existing unrelated workspace changes have been preserved.

- Deferred: feature video and Photoroom purchase/account setup.
- Services proposal still needs package allowances agreed and a separate billing/entitlements/direct-payment implementation before it can be sold. Recommended starting point: 15 published services and owner plus two staff profiles; see the proposal for access restrictions and launch requirements.
- Preview uses local fixture accounts at `http://127.0.0.1:3000`. No production customer actions, payments, messages or uploads were used for testing.
