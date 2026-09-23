# Individual event page — local redesign

The individual event page now follows the updated LinkWe design: warm cream and softly blurred event artwork, green typography, orange actions, a full uncropped poster and an organised ticket panel.

## Customer-facing content
- Full title/category, organiser and store identity, event dates/times in AST, optional end date and starting ticket price.
- Full cover/gallery viewer, every uploaded photo, thumbnails, previous/next, zoom/pan and keyboard controls. Extends the existing ProductGallery with an Event label and optional stage styling.
- Share, save on real events, an optional calendar download, and section links.
- Complete description, tags, performer names/roles/types/photos, venue/address/region, directions and map where a valid pin exists.
- Age requirements, untruncated dress code, capacity, multi-day schedule, seating, registration requirement/deadline, organiser and refund policy.
- All visible ticket tiers, descriptions/perks, ticket-validity days, sale windows, limits, availability and current totals. Inclusions expand individually.
- Linked merchandise/services/events, host storefront and existing cross-store feature-request control.
- Accurate upcoming, started, ended and cancelled states.
- Metadata respects public store eligibility and vendor-provided metadata. Private stream and scan fields are not selected for the public page.

## Ticket flow
Existing validatePromoCode and createTicketPaymentIntent server actions are retained. No payment, reservation, email or order was created during development/testing. The new selector uses integer cents with the same unit rounding as checkout, excludes expired/hidden selections and clamps quantities to stock and per-order limits. Errors recover cleanly.

The preview can demonstrate quantity limits and totals but cannot validate real promo codes or submit checkout. Remaining stock is deliberately unknown in the snapshot.

## Local preview
/preview/event/aloha-mimosas-breakfast-party-experience

Development only, no indexing. Uses public Aloha details, original poster/gallery, lineup and ticket inclusions observed on 22 September 2026. The Aloha card in the local events directory now opens this preview. Other snapshot links still open the live site. No real event record was changed.

The live poster itself shows a different date/venue from the listing metadata (poster: 18 July / Maracas Beach; listing: 28 October / La Vega Estate, Buccoo). The redesign displays the original public content; the organiser should reconcile those details before promoting it.

## Verification
- TypeScript and scoped ESLint pass.
- 17 behavioural checks pass: node scripts/test-event-detail.cjs.
- Browser: 1 General + 1 VIP = TTD 800; quantity cap at 10 General = TTD 3,500 with 1 VIP; preview checkout disabled; preview promo guard confirmed.
- Full VIP inclusions visible; photo zoom reaches 150%; next image resets zoom and reaches image 2 of 4; performer lightbox closes on Escape and restores focus.
- Desktop 1280px and mobile 390/320px checked with no horizontal overflow. Directions target the actual venue/region query; a missing map pin is clearly described.
- Existing local-only OneSignal domain warning remains unrelated.
- Not deployed. The next release should include the pending gallery/product dependencies and run the production build.
