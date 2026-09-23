# Events directory redesign — local preview

The events search page now uses the shared LinkWe navigation, cream canvas, Sora typography, orange actions and warm tropical accents established in Shop and Services. A real upcoming event anchors the hero. Poster cards show the full artwork, date and year, AST time, venue or online format, host link, age restriction and current ticket pricing/status. Missing or failed posters receive a designed text treatment.

## Browsing
- Existing q/category/region/date/sort URLs still work; underscore and space region values match.
- Date shortcuts: all dates, upcoming, today, this weekend, next seven days, this month, past.
- Date calculations use Trinidad time, including Sunday and UTC-midnight boundaries.
- Filters for available categories/regions, online/in-person and free/paid tickets.
- Search covers title, host/organiser, venue, address, region, description, tags and category.
- Shareable URL state, removable chips, sort controls, 18-event pagination and useful empty results.
- Desktop sidebar and native mobile dialog with Escape, focus restoration and explicit Apply.

## Data and pricing
- Only published events from active stores with approved owner verification are listed, matching public detail access.
- All dates remains the default, preserving access to older published listings; recommendations put upcoming events first.
- Prices come from visible tiers with remaining stock and an active sale window. Exhausted early-bird, hidden, expired and future-sale tiers do not set the advertised price.
- Missing tiers are not called free. Mixed free/paid tiers say “Free tickets available.”
- Started/past, sold out, closed sales and not-yet-on-sale states link to event details without promising purchasable tickets.
- Purchase and checkout logic is unchanged. Availability is checked again by the existing event page.
- Existing category constants moved into lib/events/categories.ts; EventFilters retains its compatibility re-export.

## Preview
If and only if NODE_ENV is development and there are no eligible database events, two public LinkWe examples are shown. Their details/prices were observed on 22 September 2026. Event and store links open the live site, with no synthetic save/checkout actions. Production never uses this fallback.

Aloha uses the existing local homepage asset. Jungle Escape's live poster URL was broken at inspection, so its example demonstrates the no-poster state. No production event data was edited.

## Verification
- TypeScript check and scoped ESLint pass.
- 22 rule/integration checks pass via node scripts/test-events-directory.cjs. Integration records are loopback-only and transactionally rolled back.
- Browser checked at desktop 1280px, tablet 768px, mobile 390px and 320px; no page overflow or broken rendered images.
- Search, free-ticket filtering, combined region/format filters, sorting, empty-state recovery, mobile Apply, Escape and focus restoration verified.
- The existing OneSignal local-domain warning remains unrelated to this change.
- No production build or deployment performed. Before release, run the production build and include shared components/shop/ShopImage.tsx and shop.module.css from the pending Shop redesign.
