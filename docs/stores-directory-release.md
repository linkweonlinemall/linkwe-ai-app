# Stores directory production release — 23 September 2026

Approved by the user: “PUSH TO MAIN SITE.”

Scope: the public `/stores` directory. The release is based on production commit `0b16bc864e208555aba9762f71d567d4447563e7` and includes only the directory page, its new components/query helpers, regression checks and documentation. Individual storefronts, admin, checkout/payment work, schema and migrations are unchanged.

Includes the new photo-led directory, real store identities and inventory counts, search, categories, areas, tags, business-type filters, sorting, pagination, mobile filter dialog and collapsible location map. The local snapshot fallback is excluded from the production release.

Validation before publication:
- All 18 directory query/integration checks passed against the guarded loopback database; fixtures rolled back.
- Scoped ESLint and diff checks passed.
- Full Next.js 16.2.6 production build passed, including TypeScript and generation of all 106 static pages. An initial sandboxed build stalled; the unrestricted restart passed.
- Local desktop and mobile layouts, search/filter recovery, map links and no horizontal overflow at 1280, 768, 390 and 320px were verified during design review.

Publication and live verification are recorded in the working project copy after deployment completes.
