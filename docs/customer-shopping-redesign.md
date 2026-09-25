# Customer shopping workspace

Release prepared 25 September 2026 together with the vendor Service Desk.

## Pages

- `/orders`: shared customer navigation; searchable orders including every item/store; status/date/sort filters and pagination; readable delivery/pickup/digital/closed states; invoice and receipt links.
- `/orders/[orderId]`: parcel progress, product quantities, weights, store links, delivery details, totals, coupon savings, invoices, QR link, digital downloads and receipt confirmation. Buyer/admin access is preserved.
- `/cart`: grouped store cards, selected-option photos/prices, quantities, stock/unavailable-item messages, removal, recommendations, subtotal and mobile checkout control. The old unsupported free-shipping threshold was removed. Shipping remains calculated at checkout.
- `/bookings`: next appointment, search and status filters, local-time dates, payments/balance, guests, staff member, notes, cancellation policy/reason, coupon savings, calendar download, virtual appointment link and store messaging. Cancellation/completion still use the existing authenticated server actions. UI now catches network failures and refreshes without a full page reload.
- `/my-tickets`: searchable event wallet, next-event sorting, upcoming/live, past/used, transferred and refunded/cancelled views. Event photos, tier, holder, reference, purchase price, PDF and entry-pass links.
- `/my-tickets/[ticketId]`: large entry QR, PDF, transfer panel, event time/location/directions, calendar, tier inclusions, holder/order details, coupons, policies and event description. On mobile the entry pass comes first.

## Functional corrections

- Cart updates require ownership, whole valid quantities and stock checks.
- Selected-option pricing now agrees across cart, checkout display, shipping-pricing lines, coupon preview, payment amount and saved order line titles/prices. Checkout retains shared product-inventory checks across options.
- Digital downloads remain accessible after paid physical orders move through fulfilment states. Unavailable files are described accurately.
- Refunded ticket orders remain visible to their owner as history. QR/online-entry/PDF actions are unavailable for transferred, cancelled, refunded, used or past tickets. The PDF route also enforces this, preventing the original buyer downloading a transferred ticket’s replacement QR.
- Fully discounted ticket snapshots display zero instead of falling back to the current ticket-tier price.
- Calendar exports use UTC instants derived from Trinidad appointment times, escape calendar values and do not invent an end time for events without one.

## Validation

- Production `next build`: passed.
- `tsc --noEmit`: passed.
- Targeted ESLint: no errors; existing native-image optimization warnings only.
- `git diff --check`: passed.
- `scripts/test-customer-shopping.cjs`: all paid/closed status states, pickup readiness, item/store search, safe URLs and cart availability.
- `scripts/test-customer-shopping-actions.cjs`: local database transaction, rolled back; anonymous/foreign-customer access, quantities, variant stock and shared inventory, archived products, removal, coupon/selected-option totals and saved order values, refunded-ticket read ownership. Provider/notification calls mocked.
- `scripts/test-creation-coupon-actions.cjs`: passed after the selected-option pricing change, including product/service/ticket coupons and targeted coverage.
- `scripts/test-customer-experiences.cjs`: appointment/event time boundaries, live events with no declared end, ticket access states, calendar escaping/time zones and discounted ticket prices.
- `scripts/test-customer-ticket-access.cjs`: actual PDF handler with mocked providers/database: unauthenticated/absent tickets rejected, ownership/paid filters present, invalid/transferred/past tickets never render a QR document, valid paid ticket succeeds.
- Browser review: desktop and 390/320px layouts, no horizontal document overflow; orders/tickets search, detail navigation, cancellation/receipt confirmation opened and dismissed; cart quantity 1 → 2 → 3 (stock limit disabled) → 1 with matching totals/header. No real payment, cancellation, transfer, confirmation or message was sent during browser checks.

Local preview fixture scripts are guarded to `localhost`/`linkwe_dev`: `customer-shopping-preview.mjs` and `customer-experiences-preview.mjs`. The local customer preview account has sample bookings/tickets/orders and a two-store cart. These fixtures must not run against production.

## Release notes

No schema changes or new environment variables. The release contains customer and Service Desk changes on top of the last deployed vendor release; earlier published work is retained. Existing fulfilment still uses shared product stock; this task does not add a new variant-inventory schema or change payment/refund policy.
