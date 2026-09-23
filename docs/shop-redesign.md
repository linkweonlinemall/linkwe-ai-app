# Shop redesign — local review, 22 September 2026

Preview: http://127.0.0.1:3000/shop. Not published.

The shop now follows the homepage, storefront and product-detail palette: warm cream, deep green, LinkWe orange, rounded photo cards, Sora typography, soft shadows and pale tropical gradients. A compact collage features photographed products from different stores where available. The product grid uses three columns on desktop and two on phones, with clear prices, vendor links, location, real ratings, discounts, delivery/collection hints, wishlist and existing purchase actions. Out-of-stock products link to their detail page.

Browsing includes a labelled search with live suggestions, populated category chips, removable active filters, a desktop filter panel and a native modal filter panel on smaller screens. Location, price, condition, stock, brand, colour and size remain available when inventory supports them. Search and sorting preserve refinements. Colour and size must match the same variant, and in-stock filtering checks that variant. Products with unlimited stock are included. URL values are normalised before querying. Results are paginated in groups of 24 instead of silently stopping at 60, with stable sort tie-breakers, total count, and clamped page numbers.

Public queries retain published-product and sellable-store restrictions. No schema, checkout, payment, admin or shared-navigation changes. New files are scoped to components/shop and lib/shop; app/shop/page.tsx and the shop-only ProductSearchBar are replaced. The old ShopFilters remains unused. Existing unrelated working changes remain untouched.

An empty development database uses existing dated public product snapshots. A visible preview banner identifies this; snapshot products link to the live detail pages, and their IDs never enter wishlist/cart mutations. Production does not use fallback inventory. Product images use Next image optimisation for supported hosts, with a fallback for missing images and other vendor media hosts.

Verification:
- TypeScript and scoped ESLint passed.
- Seven query checks passed, including malformed parameters and retaining filters.
- Nine catalogue integration checks passed on the loopback database, including paging, publication/store restrictions, unlimited stock, combined filters and matching variant availability. All fixtures were rolled back.
- Desktop and mobile visual checks completed. No horizontal page overflow at tested 320, 390, 768 and default 1174 viewport widths. Temporary viewport overrides reset.
- Browser search, sorting, price filtering, empty results, individual filter removal, location filtering, mobile modal apply/close and Escape checked. No broken loaded images in the reviewed views.
- Local OneSignal reports the pre-existing production-domain-only configuration error. Initial hot-reload missing-file messages resolved after files were created.

No live inventory records, carts, orders, or payments were changed. A production build/deployment is still required for a future live release.
