# Admin Bulk Import and Rex release — 5 October 2026

The user authorised production publication. The isolated release starts from production commit `7d8bf15cc781d76c3a1518d6a5dc6383984b1d02`.

## Included

- Durable CSV/Excel import workspaces for vendors and stores, products, services and events, with drafts, validation, duplicate handling, quick edits, row photos, history, undo and explicit review for consequential actions.
- Searchable remembered photo destinations, bulk/select-all/Shift-click selection, grouped attachment, duplicate prevention and cover preservation.
- Shared Rex conversation presentation with thinking, working, review, completion and error states. Creation Studio Rex operates the existing forms, media controls, search, navigation and account actions, with private credentials withheld and actual operation receipts.
- Friendly formatted descriptions, searchable owner/store choices, date/time controls and structured field editors. Stored formatting is sanitised and rendered consistently.

## Release boundaries

One additive migration creates ImportBatch, ImportRow, ImportAsset and ImportChange, their indexes and foreign keys. Existing application records are not rewritten or removed. The existing production build applies the migration before compiling. Existing production configuration and provider credentials are retained; no new environment variable is required.

The release adds sanitize-html and its types/dependencies, including required transitive dependency updates. Unrelated local work, fixtures, preview routes, uploads, generated media and credentials are excluded.

## Verification

On the isolated production-based release: clean dependency installation, all 71 functional checks (31 imports, 17 Studio/Rex, 23 admin), scoped ESLint, whitespace checks, TypeScript and the optimized Next.js production build passed (116 static pages).

Database tests ran against the loopback development database and cleaned their test records. AI and email providers were simulated. Browser checks were skipped at the user's request. Deployment verification uses deployment status and read-only HTTP checks, with no production records created for testing.
