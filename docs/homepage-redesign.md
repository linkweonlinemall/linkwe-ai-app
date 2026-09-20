# LinkWe homepage redesign

Release prepared September 19, 2026, following approval to publish the third design. Includes only the homepage, its navigation appearance, assets, and local-preview cache correction; unrelated service/payment work is excluded.

## Direction

An editorial Caribbean marketplace: deep ocean blue, turquoise, coral, lilac and lime; large real photography; a layered spotlight carousel; colourful entrances to shopping, services, events and stores; and a 3D-rendered Rex welcome feature. The headline is “Small islands. Big energy.” This pass increases headline, body, listing, navigation and button sizes, with stronger weights and selective gradients throughout.

The carousel crossfades every 6.5 seconds, has direct selection and previous/next/pause controls, and pauses on interaction, when offscreen, or when the tab is hidden. Reduced-motion preferences disable autoplay and decorative motion. Pointer tilt and subtle Rex float motion use CSS without a 3D library.

Shop, Services, Events, Stores, Timeline, Rex, search, account, cart and wishlist remain accessible. All 98 product categories are available through a searchable native dialog. The Local Edit has functional product filters. The existing global footer remains in use.

## Real LinkWe content

Public content was reviewed on [LinkWe](https://www.linkweonlinemall.com/) and copied for the local design preview on September 19, 2026. Featured businesses include UDN Media, Speak Loud Co., Rk Creations, Hand-Crafted Fantasies, Sugar Coat Nails and The Best Treats. Stores retain their own public cover images and logos. Listing names, prices and destinations come from the public site.

- `lib/home/live-preview.json` records the dated public listing snapshot.
- `public/images/home/live/sources.json` records original image URLs and local filenames.
- The 28 public images are saved as WebP files, approximately 3.1 MB altogether. Images below the fold load lazily.
- No generated or stock imagery from the first draft is referenced by the new homepage. Those earlier files remain on disk.

## Rex

The user supplied the hero, turnaround and expression sheets in `output/marketing/linkwe-world/higgsfield-character-01 2/`. Image generation converted these references into a transparent 3D character render, retaining Rex’s long brown locs, beard, navy LinkWe polo, cream trousers, gold watch and burgundy/cream shoes. The original generated PNG is retained in the Codex generated-images folder; the website uses the 180 KB `public/images/home/rex-3d-v1.webp` derivative.

Rex appears in a portrait shortcut under the hero actions and a dedicated `HomeRex` section after services. The shortcut scrolls to `#meet-rex`. The feature links vendors to the existing AI assistant and other visitors to the existing pricing page. This is a 3D-rendered image, not an interactive 3D model. Marketplace photographs remain actual public LinkWe listing imagery.

The local database has no published marketplace inventory. In development only, each empty collection uses this snapshot. Preview listing links open their real public LinkWe pages; preview IDs are never passed to local wishlist or purchase actions. This snapshot is not an inventory synchronisation. Production always uses its own database, with the existing published/sellable-store restrictions.

## Implementation notes

The homepage layout and styles are scoped to `components/home/`. The shared navigation accepts an optional homepage appearance; other routes retain the default appearance.

The service worker previously cached development JavaScript and CSS under reused URLs, causing old styles to conflict with new markup. It now bypasses its asset cache on loopback hosts only. Production offline behaviour is unchanged.

## Verification

The isolated release based on production commit `7a5da41` passed a full optimized Next.js production build, TypeScript, targeted homepage ESLint, service-worker syntax, and whitespace checks before publishing.

- TypeScript check passed.
- ESLint passed for the homepage and all new interactive components.
- Service-worker JavaScript syntax and Git whitespace checks passed.
- Desktop and phone designs reviewed with real images loaded; no broken loaded images detected.
- Width checks at 320, 390, 768 and 1440 pixels showed no horizontal page overflow.
- Product filtering narrowed to the real skincare listing and restored all six displayed cards.
- Category search narrowed 98 categories to Health & Beauty; Escape closed the dialog.
- Spotlight direct selection and next control changed the selected slide; interaction exposed the Play control. Autoplay was observed before pausing for inspection.
- The Maracas product destination displayed the matching live item and TTD 150 price.
- The third pass also passed TypeScript and targeted ESLint checks. Rex loaded with transparency, the hero shortcut reached his section, and the enlarged typography was reviewed on desktop, tablet and small phones.

Existing PublicNav effect-state/nested-component lint findings and the production-only OneSignal configuration error on localhost predate this design. This was a visual/navigation check, not a checkout test. Unrelated existing changes, including the order-confirmation page, were left untouched.
