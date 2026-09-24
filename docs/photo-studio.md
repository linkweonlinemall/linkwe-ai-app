# Vendor Photo Studio

Photo Studio implementation. See `docs/photo-studio-release.md` for the current production release and initial live-image cap. Open `/preview/photo-studio` in development to compare original photos with actual, watermarked Photoroom sandbox results. It serves only three allowlisted, already-generated examples; it does not bypass authentication or make provider calls. Vendors can process their own photos in `/dashboard/vendor/photo-studio` or the product-form dialog.

## Vendor workflow

- Photo Studio appears in desktop navigation and the mobile More menu.
- The new-product and edit-product image fields open the same studio in an accessible native dialog.
- Choose/drop one JPG, PNG or WebP (up to 20 MB). Client compression limits uploads to 3 MB and 2000 pixels.
- The server decodes and validates the image, strips metadata and applies an optional 3.5% brightness lift. It never requests generative relighting, expansion, new angles or product reconstruction.
- Photoroom removes the background, centres the product on a white 1600 × 1600 canvas with 12% padding, and optionally adds `ai.soft` shadows. Cropped-edge snapping is disabled so partially cropped source photos do not get pinned to the left edge.
- Switch between original/result, verify product details, then use the photo. Existing selected files remain; the reviewed photo is appended within the 10-image product limit. Existing stored product images are untouched until the vendor uses the product form's existing save flow.
- Standalone studio downloads the reviewed image; inline studio adds it to the form.
- Original and result previews remain browser-local until processing/saving; object URLs are revoked on replacement/unmount. An original is retained for the current review session, not permanently backed up by this feature.
- Results are not guaranteed pixel-identical: background segmentation, resizing, shadows, compression and brightness can affect appearance. Review is required. Occluding hands/objects may remain.

## Finishing controls — 2026-09-23

The upload UI now sends `lighting=false` to avoid stacking the old fixed brightness lift with the new finish. After the first provider result, vendors can choose Natural, Balanced (default, 40%), or Brighter (75%), then fine-tune lighting from 0–100. A luminance-based midtone lift keeps black/white endpoints and caps the shared RGB multiplier to available highlight headroom. This is a deterministic pixel adjustment, not Photoroom AI Relight.

Colour adds an optional warm/cool correction (neutral by default). Straighten rotates the existing image ±20° in half-degree steps, with preview-only alignment guides. Rotation fits the entire image on white, so corners, product edges and sandbox watermarks are retained. It can make the product slightly smaller; it does not correct perspective or invent a new camera view.

These adjustments run in the browser on the original provider result each time. They do not use extra API attempts and do not compound JPEG adjustments. Reset restores the provider result. The preview and Use/Download receive the same finished file; any change clears the review confirmation and blocks acceptance until rendering completes. Sandbox restrictions remain in place. The smaller preview and one-tool-at-a-time controls fit phone screens without overlapping the photo.

Checks: `node scripts/test-photo-adjustments.cjs` verifies natural reset, measurable dark-area lift, neutral endpoints, RGB ratios, alpha preservation, warmth bounds and uncropped rotation across every half-degree in the range. Existing adapter/API checks, TypeScript and focused lint pass. Browser checks on a real saved sandbox sample confirmed lighting presets, keyboard/range controls, half-degree rotation, alignment guides, reset, and blocked sandbox downloads, including a 390px phone layout. No new provider calls were needed. The user's remote has not been reprocessed; upload it again to compare the new controls with its original.

Provider background: [Photoroom's preservation notes](https://docs.photoroom.com/image-editing-api-plus-plan/quickstart-guide) identify AI Relight as capable of altering colours. The finishing controls above deliberately use local pixel corrections.

## Connection and safe defaults

The account owner approved key creation and local storage. The **sandbox key only** is connected in `.env.local` (ignored by git, file permissions 0600). No live key is stored and no subscription was purchased. Four successful sandbox calls produced three final sample images, including a repeat of the tumbler to verify the cropped-photo framing fix.

Server-only configuration (never use a `NEXT_PUBLIC_` prefix):

```dotenv
PHOTOROOM_API_KEY=<key stored securely on the server>
PHOTO_STUDIO_MODE=sandbox
PHOTO_STUDIO_MONTHLY_LIMIT=100
PHOTO_STUDIO_STORE_DAILY_LIMIT=10
```

Sandbox is the default and automatically prefixes the key with `sandbox_`. The UI labels test results and blocks both Use and Download actions for them. Missing keys, invalid modes, and invalid limits fail closed.

Production requires an explicit `PHOTO_STUDIO_MODE=production`, a non-sandbox key, and a positive `PHOTO_STUDIO_MONTHLY_LIMIT`. There is no default paid monthly allowance. Confirm the API plan, image quality and budget before enabling production. The Photoroom editor subscription is separate from API billing.

Allowances count reserved attempts, including ambiguous failures/timeouts (the provider may already have processed the request). Counters use UTC days/months and the existing `RateLimit` table; no migration is required. A PostgreSQL transaction advisory lock makes global/store reservations and duplicate checks atomic across processes. Repeating the same prepared image/settings within two minutes is blocked. Database failures stop processing rather than bypassing limits. Changing the key does not reset counters.

API access requires an active signed-in vendor with their own store, and POST requires same-origin submission against the actual request host (including Next's localhost URL normalization). No arbitrary remote image URLs, client prompts, provider URLs or credentials are accepted. Provider responses are bounded, decoded and re-encoded before returning; errors never include provider response bodies or keys. Keys must remain outside git and client bundles.

Official provider references:

- [Sandbox mode](https://docs.photoroom.com/image-editing-api-plus-plan/sandbox-mode)
- [Positioning](https://docs.photoroom.com/image-editing-api-plus-plan/positioning)
- [Shadows](https://docs.photoroom.com/image-editing-api-plus-plan/ai-shadows)

## Verification — 2026-09-23

- TypeScript check and Next.js production build passed.
- Focused lint passed after fixing image-comment placement.
- `node scripts/test-photo-studio.cjs`: configuration, validation, preservation before provider processing, fixed transformation parameters, provider errors/timeouts, auth, CSRF, quota failure, and binary response checks passed. Provider responses were mocked, so these do not establish Photoroom output quality.
- `node scripts/test-photo-studio-quota.cjs`: real local PostgreSQL concurrent global cap, per-store allowance rollback, duplicate prevention, and retry-window checks passed. Temporary counters were removed. The script refuses non-loopback databases.
- Browser: desktop and 390px mobile layouts reviewed; sample selection and lighting/shadow controls work; mobile has no horizontal overflow.
- A temporary development-only browser harness confirmed that Use is disabled until review, then appends the result to the native product input and triggers the existing product-form change handler. The harness used explicitly simulated provider responses and was removed after the check.
- `node scripts/verify-photo-studio-sandbox.mjs --run-free-tests`: real requests through the authenticated local API, quota reservation, Photoroom sandbox, binary image validation, and saving output succeeded for three public product photos. Each took about 2–3.5 seconds. It refuses remote databases and non-sandbox keys. Temporary local users/stores were deleted; the global attempt count remains. An optional `--sample=custom-tumbler` reran only the framing edge case.
- The integration script loads Next's local environment before dynamically importing Prisma, preventing Prisma's `.env` autoload from overriding local test authentication settings.
- Actual jar label/packaging and shirt wording/artwork appear visually preserved. The tumbler illustration is retained, but the occluding hand remains; use an unobstructed source photo for a product-only listing image. This is visual review, not a guarantee of identical pixels.
- Browser comparison toggles display real original/result images and block downloads of watermarked samples. Photoroom's dashboard still shows Free trial with 0 of 10 live images used; no live-image allowance was consumed.
- The final production build passed. The sandbox credential was absent from all 180 generated production browser assets; it remains in ignored server configuration only. Temporary credential-transfer and diagnostic files were removed.
- Only console issue observed was the existing OneSignal restriction to the production domain on localhost.

Results and generation manifest are in `output/product-photo-trial/automatic/`. Only the development preview serves these artifacts.

The user approved publication on 23 September 2026 with Growth/Pro access and a five-photo Starter trial. Production initially uses only the ten included live images with a non-renewing total cap. Paid plan activation or a larger budget requires a separate decision. See `photo-studio-release.md` for deployment status.
