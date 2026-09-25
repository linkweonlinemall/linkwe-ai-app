# Vendor Orders workspace — local preview

Updated 25 September 2026. Not deployed.

## Experience

- Shared cream, teal and orange styling across the Orders tab, product order details and service order details.
- Product/service views, attention/progress/completed/closed counts, customer/item/reference search, date filters, sorting, 12-record pages and filtered CSV export.
- All split-order statuses remain visible, including warehouse customer pickup. Actual main/store references match the order record. Unpaid and closed main orders override actionable split status.
- Product details retain items, quantities, prices, customer contact, checkout responses/uploads, delivery address/map/directions, invoice download, customer receipt QR, main-order information and estimated earnings. Historical responses whose field was removed remain visible.
- Reviewable handover choices show free warehouse drop-off or the existing TTD 40 collection charge, followed by an explicit readiness checkbox and final submit. Digital orders have a separate fulfilment action.
- Server-side owner/payment/state checks protect handover and digital fulfilment. Atomic status claims prevent duplicate collection shipments. Customer receipt confirmation stays customer-controlled.
- Service details show separate customer/vendor notes, quote photos, appointment/payment/balance details, subscription session/period information and customer messaging. Manage booking/quote opens the selected record expanded in the existing tools.
- Sidebar action count and existing tour targets match the new experience.

## Validation

- `node scripts/test-vendor-orders.cjs`: all statuses, search (including store reference), filters, date range, sorting, safe links, CSV escaping/formula protection and digital classification.
- `node scripts/test-vendor-order-actions.cjs`: real local queries with rollback, confirmation gate, unpaid/foreign-owner blocking, physical/digital separation, one collection shipment, TTD 40 fee, duplicate rejection, free drop-off and digital delivery. Payment, message and notification integrations stubbed; no customer communications.
- TypeScript and scoped ESLint checks pass. Final local production build passed (109 static pages generated).
- Browser CSV export saved successfully; the downloaded file was checked for its header and all 15 demo order rows.
- Browser checks at desktop, 390px and 320px: list/detail layouts, no horizontal content overflow, search, pagination/filter reset, empty results, disabled empty export, service-type filter, customer and vendor notes together, quote photos, booking balances, subscription sessions, expanded booking/quote handoffs and disabled collection confirmation until readiness is checked.
- Local OneSignal reports its existing production-domain restriction; it is unrelated to Orders.

## Preview data

`scripts/vendor-orders-preview.mjs` only accepts the loopback `linkwe_dev` database and existing `.test` preview accounts. Creates 15 clearly marked demo product orders plus a booking, quote and subscription. It never calls payment, email or notification APIs. Fixtures are not included in the application runtime.

Preview: http://127.0.0.1:3000/dashboard/vendor/orders

## Release scope

Include the Orders routes/adapter, `components/vendor/orders/`, `lib/vendor/order-workspace.ts`, the detail query selector, nav count and tour-copy adjustments, `app/actions/fulfillment.ts`, `app/actions/vendor-order-workflow.ts`, and booking/request deep-link changes. No schema or pricing-policy change. The main workspace contains unrelated work; use a focused release when publication is requested.
