# Shop, Services and Events release — 22 September 2026

The user approved publishing all reviewed marketplace updates.

Production base: `29c01a00cfc1abcadc633c4f1fcc53e252e1e78f`.
Isolated release checkout: `/private/tmp/linkwe-browse-release`.

Includes the Shop, Services and Events directory redesigns, complete individual event presentation, improved ticket selector and shared event photo viewer. The shop also excludes archived inventory. Existing production checkout actions, database schema, migrations, dependencies and deployment settings are retained.

The production directories query real records only. Local preview routes are excluded; the two development-only event fixtures are retained solely for the behavioural test scripts. No private event access URLs are included in the public event query.

Validation: all 69 behavioural/integration checks passed using production Prisma types. Database checks used only a loopback database and rolled back every temporary record. Scoped ESLint, whitespace checks and the full production build (including TypeScript and static generation) passed. The reviewed desktop and mobile designs are documented in the individual redesign notes.

Release commit: `0b16bc864e208555aba9762f71d567d4447563e7`, pushed to `main`.

Vercel production deployment reached Ready in 1m 13s: https://vercel.com/link-we-online-mall-s-projects/linkwe-ai-app/8PSE3AaiwaiPAt8LgwuSkz2JUBPr

Live verification confirmed all four redesigned pages. Shop returned 105 public finds and the Local Handmade filter returned 7. Services returned 12 eligible public listings and Photography & Video filtered to 3; its hero showed three providers. Events returned 2 real events with accurate starting-price states. The Aloha detail page displayed live organiser, venue, lineup, all four photos, policies, linked merchandise and actual ticket availability. Selecting one General and one VIP ticket displayed TTD 800, and removing both restored the disabled checkout. Gallery zoom reached 150%. Mobile event detail, Services and Events filters fit at 390px without horizontal page overflow. The temporary viewport was reset. No live-domain browser errors were observed in the inspected event page. No real purchase, booking, promo redemption or ticket reservation is part of release validation.
