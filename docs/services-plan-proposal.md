# LinkWe Services — package and booking structure

Status: discussion proposal, 25 September 2026. Not enabled in checkout or billing.

## Confirmed by the owner

- The service-business package costs **TT$100 per month**.
- Customers can book and pay the provider on arrival.
- This package focuses on services and limits unrelated selling tools.

## What the subscription should buy

Sell a useful daily business workspace: a public service menu, an organised appointment book, customer conversations and a clear record of work. The value should continue even when no payment goes through LinkWe.

Recommended initial package:

- Up to **15 active service listings**. Keep additional drafts without publishing them.
- Unlimited bookings, quote requests and on-demand requests, with ordinary abuse controls rather than a per-booking charge.
- Service Desk: appointments, request responses, private notes, completion history and customer records.
- Storefront, photos uploaded by the business, opening hours, service descriptions, policies and location.
- Customer messaging, reviews, QR sharing and service collaborations.
- Owner plus **two staff profiles**, working hours, time off and manual appointment assignment. This is a recommendation; the staffing allowance is still awaiting the owner's preference. Staff profiles are not dashboard logins.
- A modest monthly Rex allowance displayed as a percentage. Proposed internal budget: 25 standard prompts per month, subject to cost validation before launch. Purchased top-ups remain separate.
- A simple services report: booked work, completed work, cancellations, outstanding direct payments and recorded collections. Keep cash collections separate from LinkWe payout money.

Keep product selling, shipping, event ticketing, Timeline promotion, Photo Studio processing, bulk uploads and advanced mixed-business reports on Growth/Pro. Offer contextual upgrade links, and remove irrelevant tools from the main Services navigation.

Do not hide messages, support, existing customer commitments, billing records or the ability to cancel/manage an existing subscription after a downgrade.

## Structure services around how the work happens

Keep industry/category separate from the booking workflow. A hairdresser and a consultant can both sell appointments; a photographer and an electrician can both offer custom quotes.

1. **Appointment:** customer chooses a time, duration and location. Fixed price or clearly disclosed “from” price. Default to pay on arrival where eligible. Existing Bookable service flow is the starting point.
2. **Request a quote:** customer describes the job and can attach references. Provider sets scope, price and an agreed time before confirmation. A quote is not a paid booking.
3. **On-demand:** customer sends an immediate request. Availability, service area and estimated arrival should be clear. The provider accepts before the customer commits.
4. **Recurring service:** repeated sessions or access with explicit cadence, inclusions, remaining sessions, pauses and cancellation terms. This is the provider's customer membership, distinct from the provider paying LinkWe TT$100 monthly.
5. **Online service:** a location/delivery option for an appointment or quoted job, rather than a separate business category. Describe where the session happens and when access details are shared.

Group classes, multi-day rentals, resource/room bookings and multi-person simultaneous capacity need dedicated capacity rules. Do not advertise universal support until those rules are enforced at booking time. The current assignment enhancement checks staff conflicts after booking; customer self-selection of staff and automatic team-capacity booking are a separate implementation step.

## The pay-on-arrival journey

Customer chooses service → sees total/price basis, location and cancellation policy → books or submits a request → provider confirms → customer receives the appointment in their dashboard → service takes place → provider records the direct collection → customer can confirm completion and review.

- Present “Pay provider on arrival” before confirmation, and show the amount still due in both dashboards.
- Online-paid money and money collected directly by the provider need distinct records. Do not reuse `amountPaid` (currently online payment) or create a LinkWe payout credit for cash.
- Record collection amount, collection time and actor, with a correction history. A completion status alone does not prove payment.
- No-show, rescheduling and cancellation actions must keep staff schedules and customer appointments consistent. Automated reminders should only be promised when their delivery is verified.
- For quotes and on-demand work, the accepted scope/price must be preserved when the customer agrees.

## What must be built before the TT$100 package launches

1. Add the Services plan as a real entitlement, with 10,000 cents (TT$100) monthly pricing, renewal handling and clear upgrade/downgrade rules. Use the existing payment provider; do not create a UI-only plan.
2. Enforce the same permissions in server actions, AI tools, public checkout and navigation. Hiding menu links alone is insufficient.
3. Extend pay-on-arrival eligibility to an active Services subscription, including each supported request/booking flow. Choose a policy for service-provider customer memberships paid offline; do not silently enable automatic online recurring charges.
4. Add direct-collection records and customer-visible payment states, separate from the vendor ledger.
5. Preserve existing stores and paid commitments during migration. Exceeding a plan limit should pause new publishing, not delete listings or cancel bookings.
6. Test plan purchase/renewal/failure, cancellation, upgrade and downgrade, staff limits, publication limits, payment mode enforcement, customer dashboards and permissions using sandbox payments.

## Decision to close before implementation

Confirm the staff allowance: owner only, owner plus two staff (recommended), or unlimited profiles. The 15-listing cap and Rex allowance above are proposals, not existing entitlements or a claim that the package is ready to sell.
