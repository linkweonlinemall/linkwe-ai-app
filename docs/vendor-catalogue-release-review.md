# Catalogue release review

Prepared 11 November 2026. Status: local review only, not published.

## Open the review

While the preview server is running on Scottys-Mac.local, open:

http://127.0.0.1:3091/dev/catalogue-review

The landing page links to the actual vendor workspace and storefront components with fictional listings. Saving and shopping are disabled on those sample pages. The copied product and service links work only on this Mac while its server is running; they are not public share links.

To restart from this isolated checkout, run `npm run preview:catalogue`. Stop it with Ctrl+C. The command binds only to 127.0.0.1, rejects local `.env` files, discards inherited application credentials and uses only the disposable loopback database. It does not run migrations or seed real data. The UI fixtures do not require catalogue records in the database. The optional local fixture database serves unrelated root-layout requests.

## Review checklist

1. In **Vendor workspace**, filter Category to Accessories. The tote should remain visible. Also try listing type, Drafts and Archived.
2. Select or deselect an item, check the unsaved count, then Discard. Save stays disabled in this preview.
3. In **Store catalogue**, combine category, price, sale and availability. Clear an individual chip, reset, and try a no-results combination.
4. Open **Filtered products**. The selected view includes discounted products up to TT$130. Availability follows the same option as price, colour and size.
5. Open **Filtered services**. Quote requests and monthly subscription amounts are not treated as fixed service prices.
6. Copy either filtered link, paste it into a new tab and verify the same filters and results. Reload and Back/Forward should retain state.
7. Resize to phone width. Open Filters, navigate with Tab and close with Escape.

## Review findings resolved

An independent code review found that vendor category options were submitting readable labels rather than stored category IDs. This is fixed with explicit option values. A server-rendered regression test covers canonical product and service categories; the fixture now uses real category IDs. Sample vendor preview/copy links now open the working sample storefront instead of a nonexistent store.

No additional confirmed security or release-blocking findings were identified. Prior tests cover exact ownership, private drafts, serializable optimistic conflict rollback, URL state and same-variant pricing. The authenticated Academy-over-catalogue interaction still needs a real vendor-session browser check; source review and existing guidance suites passed.

## Decisions and remaining risks

- Catalogue selection uses the existing `isFeatured` flag, also used by recommendations and the listing editor. Unselected published items remain in the ordinary store. Approve that behavior before release.
- Marketplace filter queries load candidate variant metadata before pagination. This is correct for current filter semantics but has not been benchmarked at a large catalogue size.
- No schema change or new database migration is part of this feature. The repository's existing production build nevertheless runs `prisma migrate deploy`, so pending migrations must be checked before authorizing deployment.
- The preview is local, temporary and fictional. It does not verify authenticated production writes, checkout or live vendor data.

## Release gates

No branch push, PR, merge, external preview deployment or production deployment has been performed. The isolated branch is `codex/vendor-catalogue-filters-2026-11-11`. Verified remote main remains `b9072e6a45b02e323e3ae2990d38c9296cc09616` at preparation time.

After the user approves the preview:

1. Obtain explicit approval for the intended release action and target. Recheck current remote main and preserve unrelated local work.
2. Review Vercel branch deployment settings and environment/database isolation before pushing a review branch. This checkout does not establish a safe hosted staging environment. Its `vercel.json` only disables deployment for the unrelated `codex/admin-operations-redesign` branch.
3. Rebase or merge changes from main in the isolated feature branch if necessary. Re-run catalogue, marketplace, service/display/guidance tests, TypeScript, scoped lint and production build on that exact candidate.
4. If requesting review on GitHub, open a draft PR. Do not merge it or trigger production deployment without the separately approved release action.
5. Before production deployment, check pending migrations and record the current production deployment for rollback. Deploy only the reviewed commit using the approved workflow.
6. Verify public product and service filter links in a fresh session, vendor authorization, category selection/save, draft privacy, mobile filters and Academy state preservation. Do not change real vendor selections just for testing without authorization.

## Rollback

If a production rollout is later approved and fails, restore the previously recorded deployment through the approved release workflow. This feature has no schema rollback. Existing `isFeatured` selections are data; reverting code must not silently revert legitimate vendor selections made during the release window.

## Final preparation checks

- Independent code review completed; its one confirmed category-filter defect was fixed.
- Product and service category options were exercised in Chrome: Accessories retained the tote, Beauty & Hair retained the consultation.
- The local landing page and filtered product link were opened and visually checked. The storefront fixture now includes the production storefront theme wrapper, so the active tab and colours match the actual store.
- Final production-style build after the category fix and review hub passed; standalone TypeScript, scoped lint and regression checks passed. The subsequent fixture-only theme wrapper and canonical sample-category correction passed TypeScript and scoped lint.
- All three development review routes rendered not-found without fixture data in production mode. Next streamed those not-found responses with HTTP 200, not 404.
- The loopback preview server and synthetic local database are intentionally left running for the user's review. The preview browser tab is left open.
