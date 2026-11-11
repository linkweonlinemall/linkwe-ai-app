# Vendor catalogue and shareable filters

## Scope

A new **Store catalogue** workspace at `/dashboard/vendor/catalogue` lets vendors select existing products and services for `/store/[slug]?tab=catalogue`. The existing Pro inventory route `/dashboard/vendor/catalog` remains unchanged.

The selection uses the existing `Product.isFeatured` flag, including the existing **Feature this product** control. The workspace explains that selected listings are highlighted in the store and may be recommended elsewhere on LinkWe. Unselected listings remain available in the ordinary store. Drafts may be prepared but never become public until separately published. Archived listings cannot be edited through the catalogue and are excluded from public queries.

No database migration is needed. The feature does not create duplicate listings, publish drafts, change prices, or change stock.

## Vendor selection safety

- Vendor authentication and exact store ownership are checked server-side.
- Requests contain bounded, unique listing IDs and explicit Boolean selections.
- Saves patch only `isFeatured`, using serializable transactions and expected prior selections to detect concurrent edits.
- Foreign, missing and archived listing IDs reject the entire batch.
- Bulk selection affects only the displayed page, not hidden results.
- Copy/preview links show saved public selections. Clipboard failures show a selectable link.

## Public catalogue and filters

Catalogue, Collection and Services use one shared filter UI. URL state is scoped with `c_`, `p_` and `s_` prefixes so each tab keeps its refinements. Shared links contain the current tab and its active filters, with `#store-content` positioning.

Filters include search, item type, category, On sale, price range, availability, colour/size where relevant, service type, service location, pricing basis and sorting. The interface includes active chips, individual removal, clear-all, result counts, a desktop sidebar and a mobile dialog.

“On sale” means a valid regular/compare-at price is strictly higher than the matching listed price. Free quote requests are not discounts. Fixed prices, starting prices, call-out fees and recurring charges remain distinct; subscriptions display billing intervals. Price-range filtering defaults to fixed prices until another pricing basis is chosen.

Product price, availability, colour, size and discount predicates must match the same variant. Null variant prices inherit the parent price; zero is a valid override. Parent stock caps apply. Newest uses actual creation dates, and service duration sorting uses the booking duration.

The main `/shop` directory also gains On sale, price presets, correct option-aware price filtering/sorting/display, nonempty category facets and copyable filtered links.

## Testing

Commands run from the repository root:

- `node scripts/test-store-catalogue.cjs`
- `node scripts/test-vendor-catalogue.cjs`
- `CATALOGUE_TEST_DATABASE_URL=<disposable loopback URL> node scripts/test-vendor-catalogue-integration.cjs`
- `node scripts/test-shop-query.cjs`
- `node scripts/test-shop-pricing.cjs`
- `DATABASE_URL=<disposable loopback URL> DIRECT_URL=<same URL> node scripts/test-shop-catalog.cjs`
- Existing service-directory, product-display and service-display regression suites.
- Focused ESLint for all changed implementation files; standalone TypeScript; `git diff --check`.
- `npx next build --webpack` with a disposable local database and a nonfunctional email-key placeholder required by the existing Resend module. Do not use `npm run build` with production variables for this check: its production script applies migrations.

Database integration uses synthetic fixtures in a dedicated local PostgreSQL database. Tests roll back or remove their fixtures. No production data or live credentials are required.

Development-only, noindex fixtures are available at `/dev/store-catalogue?tab=catalogue` and `/dev/catalogue-preview`; they return not-found outside development. The vendor fixture cannot save.

## Operational notes

Option-aware marketplace price filtering/sorting reads candidate pricing metadata before pagination. This keeps totals and variant semantics correct but should be profiled if the marketplace grows substantially. No deployment or publication is part of this change.

## Verification record (11 November 2026)

- Final production-style webpack build, standalone TypeScript and targeted ESLint passed.
- Query and variant-pricing tests passed (21 checks); real marketplace database tests passed (16 checks).
- Storefront URL/filter assertions passed, including parent stock caps, archived exclusion and booking duration.
- Vendor offline action and real PostgreSQL transaction tests passed, including conflict rollback and private drafts.
- Existing service-directory (14), product/service display (14), and tutorial/navigation/motion (13) checks passed.
- Browser: availability changed the displayed matching variant price correctly; reload and Back/Forward restored filter state. Copied product and service filter links were pasted into fresh tabs and restored the correct results.
- Vendor fixture browser checks: selection produced an unsaved change, Discard restored it, published/draft labels were correct, and archived listing/selection controls were disabled. Saving stayed disabled in the fixture.
- Mobile at 390 × 844: filter dialog fit the screen, focus entered the dialog, Tab navigation worked, and Escape returned focus to the trigger. A numerical overflow measurement could not be obtained from the browser tool.
- Production runtime: unauthenticated vendor route redirected to sign-in. Both fixture routes rendered Next.js not-found content with noindex and no fixture data. Next.js streamed these not-found responses with an HTTP 200 status.
- The authenticated learning-centre-over-catalogue interaction was not exercised in-browser. Source review keeps the catalogue mounted independently of guidance, and the existing guidance regression suites passed.

No production writes, commits, pushes or deployment were performed. Local development, production-test and database processes were stopped after verification.

## Release preparation follow-up

See `docs/vendor-catalogue-release-review.md` for the local review link, restart instructions, resolved category-filter review finding, release gates and rollback plan. `node scripts/test-vendor-catalogue-ui.cjs` now also checks that readable category labels retain canonical product/service IDs and that sample links stay on the working sample storefront. This follow-up leaves the local review server running for the user; nothing has been published externally.
