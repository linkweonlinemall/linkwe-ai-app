# Admin management release — 22 September 2026

User explicitly approved publishing the admin upgrade.

- Production base: `7ba4e61e41c05b33e80bd1c7114e83383542dac9`.
- Release commit: `29c01a00cfc1abcadc633c4f1fcc53e252e1e78f`, pushed to `main`.
- Release checkout: `/Users/kylescott/.codex/worktrees/linkwe-admin-release/linkwe-ai-app`.
- Vercel deployment: https://vercel.com/link-we-online-mall-s-projects/linkwe-ai-app/FdBNTN5ttTY5gnW2FqZdKDharRLo

The release contains the reviewed admin UI, Creation Studio, full record editors, administrative actions and validation, mobile layouts, staff guide, and local-only test scripts. The startup animation is skipped in Admin, and a duplicate rich-text extension was removed.

Production schema, migrations, payment lifecycle, public marketplace pages, deployment configuration and package versions were retained. The separate service-payment work in local development commit `0a8dbc9` was not included. The production vendor service action was retained; the new admin validator uses its own shared configuration helper.

Checks in the isolated release checkout: production build passed using production Prisma types, all 23 integration checks passed against the loopback database, and whitespace checks passed. No production test records were created and no real order, refund, payout, booking, message or identity decision was executed for validation.

Vercel completed the rollout successfully. Live checks confirmed the new overview (17 active stores), Creation Studio, global record search, store/product/service editors, service catalogue (33 services), order search across all records, and People & access account-management links. The existing records loaded without submitting any changes.

Mobile checks at 390 × 844 confirmed that the service editor and order search fit without horizontal overflow. The temporary viewport override was reset, and the verified live admin overview was left open for the user.
