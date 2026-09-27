# Marketplace design release — 20 September 2026

Approved for production by the user after the local service and shared-menu review.

- Release commit: `be9df0868fbca882c007be2d2b3203976eee60e5` on `main`, followed by wording correction `7ba4e61e41c05b33e80bd1c7114e83383542dac9`.
- Release checkout: `/Users/kylescott/.codex/worktrees/linkwe-design-release/linkwe-ai-app`.
- Vercel deployment: https://vercel.com/link-we-online-mall-s-projects/linkwe-ai-app/7yKLZWuUjN1wLP9z9XfZUNoy4raE

## Included

Homepage palette and tropical cards, diversified product/service rotation, transparent logo, store cover blur and logo-colour overlay, store identity and tab refinements, complete product/service presentation, improved photo viewer and recommendations, and consistent public menus with a separate non-homepage palette. Archived listings are excluded from homepage rotation.

The release is based on production commit `8a598f1`. Existing production booking/payment/subscription actions, schema, migrations and deployment configuration remain unchanged. The service page uses production's existing active-subscription flow. The separate payment lifecycle work on the local development branch is not included. Development-only preview routes, unrelated marketing assets and import/reconciliation scripts are not included.

## Pre-release checks

- Production build, including TypeScript and static generation: passed in the isolated checkout using the production schema.
- Scoped ESLint and whitespace checks: passed.
- 25 tests covering homepage diversification, logo colours, product options/data, gallery geometry and service details/pricing: passed.
- Original desktop/mobile previews and controls were reviewed before release.

## Deployment

Both pushes to `main` succeeded, and both Vercel production deployments reached Ready. The final deployment is https://vercel.com/link-we-online-mall-s-projects/linkwe-ai-app/DUmBTR4TwjyZkWFj15ZoCHnX4g8q (2m 13s).

Live verification on https://www.linkweonlinemall.com/:

- Homepage retains its cream menu and orange accents. Three service cards showed three different vendors; real products from multiple stores loaded.
- Service page shows the new layout, authenticated quote form, full description, vendor details, map/directions, reviews and related services. A final correction maps vendor response codes to readable labels; “Within 48 hours” is confirmed in both locations on the live page. Its seven service tests, scoped lint and TypeScript checks passed before the second deployment.
- Product page shows its pricing, stock, vendor fields, full description, policies and recommendations. Full-screen photos opened; zoom changed from 100% to 150% and closed successfully.
- Storefront uses its own blurred cover and extracted logo colour. The inspected brand colour was `149 209 92`; the backdrop applied `blur(20px)`. The matching menu section is highlighted.
- Mobile storefront at 390 × 844 fits without horizontal page overflow. Signed-in account menu opens and closes. The viewport override was reset.
- No broken loaded images or browser errors observed on the inspected live pages. No purchase, booking, quote, message, review or follow transaction was submitted.
