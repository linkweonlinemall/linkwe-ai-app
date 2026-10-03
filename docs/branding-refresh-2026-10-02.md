# Approved icon-only website branding

Production release approved on 2 October 2026 (America/Port_of_Spain). Assembled against production commit `a1cf33791cc57d5a41001221488080b6e21eba4d` using only the branding patch and explicit asset inventory. The existing development checkout and its unrelated work are preserved. Publication uses `origin/main` and the existing Vercel integration.

## Approved source

- Authoritative file: `/Users/kylescott/Desktop/LinkWe New Logo.png`.
- Reusable, byte-identical copy: `public/branding/approved-logo.png`.
- SHA-256: `c08d5eda9996623d82efd78f7b8e460499c02e4bf3402852a7a3392b6390e571`.
- The source is a 1254 × 1254 RGBA PNG. It has 858,235 fully transparent pixels; the dark preview background is not baked in.
- All derivatives retain the original orange/red pin, blue/orange chain, sun, palm and original alpha. No lettering is added to the artwork. Lanczos resizing and centered padding are deterministic.

## Created variants

Canonical assets are under `public/branding/v2/`. `inventory.json` records every size, background, transformation and compatibility alias.

| Use | Dimensions / treatment |
| --- | --- |
| Transparent marks | 64, 96, 128, 192, 256, 512 and 1024 px square |
| Favicons | 16, 32, 48, 64, 128 and 256 px; six-size ICO |
| Android/PWA and shortcuts | 72, 96, 128, 144, 152, 192, 384 and 512 px; white opaque background |
| Maskable PWA | 192 and 512 px; separate padded artwork fully inside the central 80%-diameter safe circle |
| Apple touch icons | 152, 167 and 180 px; opaque white background |
| Notification badges | 72 and 96 px; white silhouette using the approved artwork's alpha |
| Social sharing | 1200 × 630 PNG, icon centered on a light background |
| Website startup | 1080 × 1920 portrait and 1920 × 1080 landscape JPG |
| iOS startup | 36 PNGs: portrait and landscape for 18 phone/tablet size and scale combinations, with matching metadata media queries |

67 canonical images were generated. Another 42 legacy public filenames now serve the new artwork for compatibility with old links and previously generated content. Native Next.js `app/icon.png`, `app/apple-icon.png`, and `app/favicon.ico` were replaced. The manifest keeps its existing app identity and start URL.

Run `node scripts/generate-branding.mjs` to regenerate these assets. The script refuses a source whose checksum differs from the approved master.

## Updated placements

- Desktop/mobile public navigation, customer dashboard navigation, footer, sign-in and other auth pages, onboarding, admin header, vendor sidebar and older dashboard wrappers.
- Error/not-found/offline pages, event staff scanning, route loaders, website startup splash, installation prompts and the install-guide phone preview.
- Browser favicon, Apple icons, PWA manifest and shortcut icons, Apple startup metadata, organization structured data, Open Graph and Twitter sharing.
- Store sharing image uses the bundled approved mark; vendor-provided logos and cover images retain their existing behavior.
- Push notification icon and monochrome badge; shared transactional emails, admin alerts and bulk-user email header.
- Customer invoice and event ticket PDF logos, with square layout proportions. Vendor invoices continue to use the vendor's own logo. The QR studio was audited: its QR artwork has no embedded LinkWe logo to replace.
- Rex's shirt emblem and lettering were replaced with the exact approved icon, using adjacent original fabric only in the old emblem area. The three legacy hero banners' old logo corners now contain the approved icon on a light plate. Original versions are retained outside the served website in `output/branding/site-refresh/source/`.
- Typographic LinkWe/AI logo lockups were removed from identity blocks. Legitimate company names, document issuer text, feature copy and Rex AI features remain.

The original approved image, the earlier supplied workspace copy, advertising scripts/videos/research, vendors' logos and unrelated working changes were preserved.

## Cache handling

All active image references use `/branding/v2/` or the versioned Rex path. The manifest URL is versioned; the service worker cache is `linkwe-v10-branding-v2`, precaches the new identity assets, and deletes prior LinkWe caches on activation. Legacy filenames are also refreshed so they cannot continue serving old artwork after the deployment receives the updated files.

## Validation

- `npx next build`: passed. The sandboxed attempt stalled; the authorized run outside the sandbox completed successfully.
- `npx tsc --noEmit --pretty false`: passed, including a final run after all source edits.
- `node scripts/test-branding.mjs`: passed. Checks master checksum, dimensions, transparency, maskable safe circle, monochrome badges, alias contents, manifest image sizes, ICO, service worker precache/upgrade behavior and remaining active legacy references.
- Generator and asset-test script lint: passed. Scoped application lint reports six existing errors; checking the pre-task source snapshots confirmed the same six errors before and after this change, with no new error rules introduced.
- Local Chrome checks at 1440 × 1000 and 390 × 844 covered the home page, dark public navigation, auth page, footer, customer/vendor/admin dashboards and startup screens. All visible branding images loaded. The vendor sidebar is intentionally hidden on mobile in the existing layout.
- Verified the served favicon, Apple touch icon, manifest and social metadata, all three manifest icon URLs, and all 36 Apple startup tags.
- Generated sample customer/vendor invoices, a long invoice and a ticket. Visually inspected the customer invoice and ticket renderings: artwork proportions and document layout are correct.
- Confirmed the production build bundles the local image files needed by invoice, ticket and store-sharing image routes.
- Final source audit found no active references to old logo asset names or the old LinkWe AI email wordmark.

## Review and delivery

- Visual evidence: `output/branding/site-refresh/visual-checks.png`; individual desktop/mobile screenshots and browser/metadata results are in the same directory.
- Successful build log: `output/branding/site-refresh/production-build.log`.
- Branding-only source patch against the pre-task working files: `output/branding/site-refresh/branding-only-code.patch`. This patch is for review; generated assets, new scripts and the startup-image JSON must also be included in a future release.

The production release package passed its optimized build and branding checks before publication. Real-device installation and delivery of actual push notifications/emails were not performed. External share caches and existing installed home-screen icons were not tested on physical devices. Old artwork remains only in historical/nonserved source material and previously delivered media, not in active website logo references.

Production package: 161 scoped files; 33 existing code/manifest/worker files patched against production. No schema, dependency, payment, environment, catalogue or advertising changes are included. Development-only preview routes are excluded.
