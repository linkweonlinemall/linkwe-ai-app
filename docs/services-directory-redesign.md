# Services search redesign — local review, 22 September 2026

Preview: http://127.0.0.1:3000/services. Not published.

The services directory now follows the redesigned homepage, storefront, product and shop pages: Sora typography, warm cream, deep green, orange actions, real photography and softly coloured service cards. The hero highlights three photographed services from different providers where possible. Five shortcuts explain appointments, quotes, recurring services, on-demand requests and online sessions.

Cards show real provider links, location, service type, relevant session length, response time, deposit, included sessions, price basis and customer ratings when available. Bookings marked unavailable show a paused label. Wishlist buttons are independent of service links. Service actions open the existing service-detail experience without making a booking or sending a request.

Search and filters use the URL, so back/forward navigation and shared links preserve refinements. Filters cover category, type, provider area, service location, quoted/listed pricing, listed fee range and rating. Sorting retains the prior rating/recommendation, price, name and duration options. All published, unarchived services from sellable stores are considered on the server, with 18 results per page; the old silent 60-service cap is removed. Unpriced quotes follow priced services in both price directions and are excluded from numeric fee ranges. Online service types match the online-location filter even when no separate location value is set. Session duration uses booking duration when applicable.

An empty development catalogue uses dated public service snapshots with a visible banner, real service-detail destinations and no wishlist or booking mutations using preview IDs. Production has no snapshot fallback. No generated images or new dependencies were added. ShopImage and the shop's shared form/layout stylesheet are reused, so the pending shop redesign is a dependency of this release. The existing services launch notification option remains available for an actually empty catalogue.

No changes to app/actions/services.ts, booking/payment actions, database schema, admin or public navigation were made for this work. Other existing work remains untouched.

Verification:
- TypeScript and scoped ESLint passed.
- Fourteen directory checks passed: URL validation, zero/reversed prices, retained refinements, quote pricing semantics, virtual location, duration, ratings, combined search, paging, published/archive/product restrictions, store status, owner verification and automatic test-data rollback.
- Real query checks ran inside a rolled-back transaction against the loopback database.
- Browser checks passed for provider-name search, sorting, location filtering, empty results, individual filter removal, clear all, mobile apply and Escape dismissal.
- A service card opened the matching live Professional Portrait Photography detail page. No quote or message was submitted.
- Desktop and phone layouts visually reviewed. Width checks at 320, 390, 768 and default 1280 showed no page overflow. Temporary viewport overrides reset.

A production build and deployment are still required if approved for release.
