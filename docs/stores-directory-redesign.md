# Stores directory — local design review

Preview: http://127.0.0.1:3000/stores

Scope is the public Stores directory at `/stores`. Individual `/store/[slug]` storefronts are unchanged. No deployment, push, database migration or live record modification was performed.

The directory follows the new LinkWe design with Sora typography, cream and green, orange actions, store cover photos, raised logo tiles, tropical card tints and a three-store hero. Cards show each business's name, tagline, category, area, real ratings, separate published product/service/event counts, legacy listing counts, approximate distance where available, follow controls and links to the existing storefront. Follow controls are separate from navigation links.

Browsing includes search, populated categories and areas, interests/tags, product/service/event shortcuts, recommended/newest/most-to-explore/rating/nearest/name sorting, URL-preserved filters, removable chips, 12-store pagination, a desktop sidebar and native mobile dialog. Nearest sorting uses an explicitly requested browser location; invalid/missing coordinates never become invented distances. No location permission was requested during testing.

A collapsible Mapbox map is loaded only when opened. Pins reflect all matching stores with valid saved coordinates, across pagination. Selecting a pin opens a store link. No pins and map failures have explanatory fallbacks. Filtering resets map selection and fit bounds.

Discovery requires an active store with an approved owner and published unarchived products/services, a published legacy listing, or a published event. This also includes event-only businesses. Draft-only, archived-only and empty stores stay excluded. Review aggregation counts a review linked to both a legacy listing and store once. Search includes names, taglines, descriptions, categories, areas and tags. Store ratings retain the existing store/legacy-review basis rather than mixing in unrelated product reviews.

An empty development database uses six dated public store examples from existing homepage assets and public store-detail snapshots. Product counts and reviews are not fabricated. Preview follow mutations are disabled by omission, and store links open the actual live storefront. Production never uses the fallback.

Verification:
- TypeScript and scoped ESLint passed.
- 18 query/integration checks passed using `node scripts/test-stores-directory.cjs` against the loopback database; all temporary records rolled back.
- Desktop hero/cards reviewed. Search for “portraits” finds UDN Media; filtering Tunapuna finds Sugar Coat Nails; conflicting business type produces a useful empty state.
- Clear-all recovery, mobile Apply, Escape dismissal and focus restoration verified. Store map loaded and UDN Media pin linked to the correct storefront.
- No horizontal page overflow at 1280, 768, 390 and 320px. No broken loaded images in the inspected mobile results. Temporary viewport overrides reset.
- A duplicate sibling key detected during initial browser testing was corrected; search/results then updated correctly. Existing localhost-only OneSignal domain warning remains unrelated.

Release dependencies: the already-published shared ShopImage and shop styles. New directory code is confined to components/stores and lib/stores, with app/(storefront)/stores/page.tsx replaced. Existing public-stores actions and shared storefront components remain untouched. Before publishing, run the production build in the isolated production-based release checkout as with the preceding marketplace releases.
