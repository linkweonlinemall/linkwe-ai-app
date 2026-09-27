# Discovery, notifications, app installation and product swatches

Status: completed locally. This batch has not been deployed to the live website.

## What you can try

- **Product swatches:** Colour options now have glossy swatches, colour names, an orange selection ring and a checkmark. Size options have matching styling. Sold-out options are labelled. Selecting a complete combination updates its price, image, available quantity and cart selection. Switching to a colour with different sizes clears incompatible choices.
- **Main search:** A redesigned search page and larger cards bring products, services, stores, events and tickets together. Search suggestions include thumbnails, prices, collection shortcuts and recent searches. Sorting, filters, counts and pagination use the full matching inventory. Selected colour/size combinations must exist together; their actual variant prices are used in main search.
- **Notifications:** Open the bell for recent updates, switch between all and unread, or choose “Open all notifications.” The new `/notifications` page adds search, categories, pagination, refresh and “Mark all read.” New arrivals after the displayed snapshot remain unread. Notifications remain private to each account.
- **Shopping bag:** The slide-out groups items by store, displays selected variants and unit/line prices, and provides clearer quantity, remove and checkout controls. Delivery is calculated at checkout; digital-only carts show a digital-delivery message.
- **Categories:** The home category browser, main search and public directories share a catalogue for products, services, stores, events and tickets. Tickets lead to events with tickets currently on sale. Store onboarding and editing use the same business categories. Earlier category values remain compatible with discovery and resumed onboarding.
- **App installation:** `/get-app` detects the device and presents an appropriate guide. Supported browsers offer the native install prompt after a click. Other browsers show device-specific steps and a copy-link button. Accepted installation is distinguished from confirmed installation. The optional reminder respects dismissal and avoids checkout, authentication and dashboard flows.
- **Orange accents:** The home slogan ribbon is orange. Dashboard headings, navigation selections, filter controls, menu icons and key actions use orange alongside Rex blue.

## Filter coverage

| Area | Controls |
| --- | --- |
| Main search | Collection, category, region, price, rating, sort; products add colour swatches, size, brand, condition and stock; services add booking type and location; events add date and ticket availability. |
| Product directory | Category, price, stock, store location, delivery/pickup/digital fulfilment, condition, brand, size, colour swatches and sorting. |
| Service directory | Category, workflow, provider area, service location, listed versus quoted fee, price, rating, maximum duration, accepting bookings/requests and sorting. Availability still requires date/time confirmation where applicable. |
| Store directory | Category, area, business offering, interests, customer rating, nearby search and sorting. Location access is requested only after choosing nearby search. |
| Events and tickets | Date, category, region, online/in-person, free/paid tiers, ticket availability, starting-ticket budget and sorting. Hidden, exhausted and closed tiers cannot advertise a purchasable price. |
| Storefront | Searchable category and sort controls, product colour swatches and sizes, stock and price; service type, location, category and listed fee. Updates happen as filters change. |
| Customer pages and saved events | Existing account filters retained, with orange selections and clearer accessible labels for saved-event search, area, format and dates. |
| Vendor workspace | Existing workspace filters retained with shared orange focus and selection styling. |

## Verification

- Production build and TypeScript checks passed.
- Product query, catalogue, services, stores, events and product-option regression suites passed.
- New discovery checks passed: category compatibility, matching colour/size/stock, zero and overridden variant prices, global sorting/pagination/rating, delivery/pickup/digital filters, quote-price handling, ticket availability, private notifications and read-snapshot protection.
- The full existing release suite passed, including checkout, cart ownership, onboarding, identity skipping, Rex ownership, reviews, staff, collaborations, coupons and Photo Studio quota protections. Test providers were mocked; database fixture writes rolled back.
- Browser checks at desktop and phone sizes covered product swatches and purchase state, search suggestions, mobile colour filtering, ticket budgets, categories, orange ribbon, vendor accents, customer slide menu, notifications and cart totals. A temporary cart quantity change was restored.
- Device guidance and unsupported-browser install fallback were verified. Native installation cannot be completed inside this embedded preview; check that final browser prompt on a supported device after release.

Installation references: [MDN install prompts](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt), [Apple iPhone web apps](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/27/ios/27).
