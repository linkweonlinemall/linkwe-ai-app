# Shop, Services and Events release — 22 September 2026

The user approved publishing all reviewed marketplace updates.

Production base: `29c01a00cfc1abcadc633c4f1fcc53e252e1e78f`.
Isolated release checkout: `/private/tmp/linkwe-browse-release`.

Includes the Shop, Services and Events directory redesigns, complete individual event presentation, improved ticket selector and shared event photo viewer. The shop also excludes archived inventory. Existing production checkout actions, database schema, migrations, dependencies and deployment settings are retained.

The production directories query real records only. Local preview routes are excluded; the two development-only event fixtures are retained solely for the behavioural test scripts. No private event access URLs are included in the public event query.

Validation: all 69 behavioural/integration checks passed using production Prisma types. Database checks used only a loopback database and rolled back every temporary record. Scoped ESLint, whitespace checks and the full production build (including TypeScript and static generation) passed. The reviewed desktop and mobile designs are documented in the individual redesign notes.

Release build and live rollout verification are recorded after completion in the local release log. No real purchase, booking, promo redemption or ticket reservation is part of release validation.
