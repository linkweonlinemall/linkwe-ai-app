# LinkWe experience upgrade — 26 September 2026

Implemented and checked locally. This batch has **not been published to the live website**. PhotoRoom purchasing and the promotional video remain deferred.

- [x] Rex Blue brand across public, account and dashboard surfaces
- [x] Main search: recent searches, keyboard navigation, clearer discovery and reliable results
- [x] Timeline: discovery, following and clearer post navigation
- [x] Rex: redesigned workspace and floating chat; percentage-based capacity throughout
- [x] Customer and vendor invoice templates based on supplied references
- [x] Vendor support tickets with private threads, status and an administrator queue
- [x] Vendor reports with date selection, meaningful financial distinctions and export
- [x] Service setup and operations guided by the customer journey
- [x] Vendor settings navigation and account/store readiness
- [x] Rebuilt guided tours with explicit navigation, pause/resume and accessible controls
- [x] Wishlist and saved stores with search, sorting and useful empty states
- [x] Services plan: TT$100/month, Starter benefits, 20 services, no service-price cap, eligible pay on arrival
- [x] Customer messages workspace
- [x] Type checks, meaningful regression tests and desktop/mobile review

Decisions: invoice example text is sample data only. Existing order and contact records remain authoritative. Services retains Starter product limits and online commissions; cash collected directly is separate from LinkWe payout balances. PhotoRoom purchasing and promotional video remain deferred.

## What is new and how to use it

| Area | What changed | Where to try it |
| --- | --- | --- |
| Brand | Rex Blue replaces the green interface palette, including navigation, dashboard panels, forms and status accents. Existing brand artwork retains its own colours. | Across the site |
| Main search | A spacious search panel with live suggestions, recent searches, category shortcuts and keyboard navigation. On a phone it opens as a focused full-screen panel. | Search in the main header |
| Timeline | Switch between Following and Discover, search posts, filter content, refresh and load more without duplicating posts. | `/timeline` |
| Rex | A redesigned portrait treatment, task cards, workspace and floating chat. Capacity uses a percentage meter; plans describe welcome, expanded or maximum access without numeric prompt counts. The existing mascot artwork is reused. | Vendor workspace → Rex AI, or Ask Rex |
| Invoices | Separate customer and vendor PDFs inspired by the supplied orange, charcoal and white layouts. Real order information, QR references and page numbers replace the sample data. Vendor earnings use recorded commission when available and clearly label estimates. | Existing order invoice downloads |
| Support | Private vendor-to-LinkWe tickets, category, priority, order/listing reference, message history, replies, status changes and reopening. | Vendor workspace → Support; admin workspace → Support |
| Reports | One-, three-, six- and twelve-month views, sales trend, top products, unique buyers, completion, service activity, released online earnings, CSV export and print. | Vendor workspace → Reports |
| Services | A workflow-led setup hub, clearer next steps and new fields for inclusions, customer preparation and expected results. | Vendor workspace → Services |
| Settings | Account readiness plus Account, Security, Business and Billing & access sections, with direct links to the relevant tools. | Vendor workspace → Settings |
| Tours | A rebuilt guide with 32 lessons, highlighted controls, step selection, Back/Next, explicit Show me where, Let me try, pause and resume. Guides never save or publish on a vendor's behalf. | Tour in the page header, or Help & tutorials |
| Saved favourites | Search and sort saved items/stores, move between both collections and jump to store updates in Timeline. Wishlist prices and availability remain current. | `/wishlist` and `/saved-stores` |
| Customer messages | A full inbox with search, filters, sorting, saved drafts, quick replies, conversation search and a mobile thread layout. Read state and conversation access are checked for the signed-in customer. | Customer Messages |

## Services package and practical workflow

The Services plan is **TT$100 per month**. It includes up to **20 non-archived services**, counting drafts, and **no plan price cap for services**. It otherwise keeps Starter benefits: 30 products, the same one-time Rex welcome access, and the same online commissions (15% products, 8% services, 6% event tickets). Timeline publishing still requires Growth or Pro.

Vendors choose how their work is sold:

1. **Appointments:** a customer selects a time for a defined session.
2. **Custom quotes:** agree the job's scope and price before work begins.
3. **Callouts:** review the customer's location and request, then confirm availability.
4. **Online appointments:** book a remote session and share the meeting details privately.
5. **Memberships:** define recurring services, included work and renewal terms.

After creating an offer, vendors manage its bookings, requests, quotes or subscribers in **Service Desk**. Active Services, Growth and Pro providers may offer **pay on arrival for eligible services**. Online appointments and customer memberships continue through online payment. Direct customer collections do not become LinkWe payout funds.

This structure supports many industries, but it does not add automatic resource inventory, multi-day rental reservations, staff-capacity allocation or simultaneous group-capacity booking. Those need dedicated rules beyond this release. See `docs/services-plan-proposal.md` for the confirmed package and boundaries.

## Recommended support system

Use the new private Support centre as the official record for vendor issues. Vendors select a category and priority, describe the issue and include an order or listing reference when relevant. Administrators respond in the same thread and move it through **Open → In progress → Waiting on vendor → Resolved**. A vendor can reply or reopen the issue if help is still needed.

This keeps support separate from customer sales conversations and gives both sides a shared history. In-app notifications accompany updates. This release does not add email delivery, file attachments or a guaranteed response-time promise.

## Validation completed

- Production build and TypeScript checks passed.
- Public-release, vendor/customer messaging, Services plan/billing, support ownership, service-cap enforcement, Timeline pagination and Rex workspace regression checks passed.
- Payment tests used mocked providers and rolled-back local database changes; no real payments or AI-provider calls were made.
- Desktop review covered Services, Rex, Support, Reports, Settings, pricing, Timeline, saved favourites and customer messages.
- Mobile review covered main search and keyboard navigation, customer inbox/thread/search, and tour progression, target scrolling, minimize/resume and closing.
- Customer and vendor PDF previews were rendered and inspected. A 36-item invoice was also checked across all three pages.

## Publication notes

Published in release `926b05a`, including all three production database migrations. See `complete-site-release-2026-09-26.md` for verification. Invoice preview PDFs remain local in `output/pdf/`.
