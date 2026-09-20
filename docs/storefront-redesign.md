# Storefront redesign

Status: release preparation authorized on 20 September 2026. The production release is isolated from unrelated work and does not change the database schema.

## Preview

- Shop: http://127.0.0.1:3000/preview/storefront/rk-creations-tt
- Services: http://127.0.0.1:3000/preview/storefront/udn-media

The local database has no published storefronts. These development-only routes use public Rk Creations and UDN Media content and the existing homepage image snapshot to render the same components used by `/store/[slug]`. They return not-found outside development and are marked no-index. Preview listing links lead to the original public listings; follow/message links open the real store, while cart, wishlist, and review mutations are excluded from the sample data.

## Design

- Navy and teal cover, large store name, rounded angled imagery, a floating listing card, mint/lime calls to action, and Caribbean details matching the homepage.
- Discover is the new default: products, services, a short introduction, photo mosaic, keyboard-accessible gallery, and timeline introduction.
- Sticky store navigation keeps the collection, services, business details, timeline, reviews, and partner recommendations accessible.
- Larger listing photography, search and existing catalogue filters, visible shopping actions, and correct quote labels.
- Native mobile filter dialog supports focus containment, Escape, reset, and applying results.
- Existing store visibility, authentication, follow/message, cart, wishlist, reviews, and server queries remain in place. No new commerce endpoints or data model changes.
- Reduced-motion preferences are respected. Layout checked at desktop, 768px, 390px, and 320px.

## Verification

- `npx next build`: passed, including TypeScript and static generation.
- Standalone TypeScript check: passed after navigation and quote-label refinements.
- Targeted ESLint: storefront components, preview factory, and both routes passed.
- PublicNav retains existing lint findings from before this task: synchronous state updates in effects and nested LogoMark component. These are unrelated to the new appearance option; no broad navigation refactor was made.
- Browser checks: product search, category filter, reset, mobile filter dialog/Escape, gallery next/Escape, service search, all store tabs, anchor positioning, and responsive layout. No broken loaded storefront images detected.
- Authenticated checkout/follow/message mutations were not performed during the design preview.

## Scope

Core additions: storefront CSS module, shared image and listing card, Discover overview, and development preview route/data. Existing hero, stats, tabs, About, and mobile filters use the new presentation. PublicNav has an opt-in storefront appearance. Previous homepage work and unrelated order-confirmation edits remain untouched.

## Location and information follow-up

- Cover and introduction location labels now open Google Maps directions to the exact saved store pin. Address/name search is used when no coordinates are published; no city-centre pin is invented.
- The Discover view now includes a map, full address, Google Maps links, all seven days of opening hours, and social/contact links. The map remains in Store info as well. A coordinate-based OpenStreetMap embed is available when Mapbox is not configured.
- Store info preserves the full description, gallery, amenities, tags, social links, hours, and now renders published policies. Expanded amenities/tags remain available.
- Local previews now use the actual public pins, full descriptions, all nine gallery images per store, hours, social links, and complete tags/amenities read from UDN Media and Rk Creations. No production records were modified.
- Verified the cover click opens Google Maps at the same destination as the existing live store directions link. TypeScript and targeted ESLint passed.

## Pre-release customer information audit

Checked the public storefront against the Store schema and the vendor's store-edit form:

| Customer-facing information | Display |
| --- | --- |
| Name, tagline, logo, cover, category, region | Hero and store identity |
| Full description, complete gallery | Discover and Store info |
| Address and saved location pin | Clickable hero location, map, Google Maps directions |
| All seven opening days, multiple time slots, closed/all-day state | Discover and Store info |
| Website, WhatsApp, Instagram, Facebook, X, TikTok, YouTube, LinkedIn | Published contact/social links |
| Amenities, tags, vendor policies | Store info, with expandable complete lists |
| Published products, prices, variants, stock, discounts | Collection and linked product details |
| Published services, quote type, duration, location, subscription billing interval, availability | Discover, Services, and linked service details |
| Published vendor events | Discover and Events, with date, venue and event/ticket links |
| Reviews, rating, followers, business timeline, approved partners | Hero, stats and dedicated tabs |

Added event discovery and corrected service cards to distinguish call-out fees, starting prices, quote requests, recurring billing intervals, and on-demand availability. Variant products no longer show an incorrect out-of-stock badge based on parent stock.

Owner contact/account credentials, identity-verification documents, payment details and internal subscription fields are private. Customer checkout questions remain in checkout. Optional public information is shown when supplied by the vendor; missing information is not invented. The development snapshot routes/data are excluded from the production release.
