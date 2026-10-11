# Live Stock Update feature descriptions — 11 October 2026

The deployed Pro stock tool was present in dashboard navigation and Creation Zone, but absent from public pricing, the feature directory and plan-selection descriptions. This follow-through starts from production commit `25c7c9c412e9a856b781ab4ca589c55234cb839a` on isolated branch `codex/pro-stock-feature-copy`.

## Surfaces covered

- Pricing: Pro benefit, a four-plan comparison row, workflow FAQ and clarification that ordinary stock editing and QR label creation are shared features.
- Feature directory: searchable Live Stock Update entry, linked to the workspace; QR Studio explains product-label reuse.
- Onboarding: Pro's benefit list includes the tool only on Pro.
- Finance: Plan & Rex describes the feature and links to the workspace; Pro upgrade descriptions include it.
- Stock upgrade screen: workflow, inventory-only scope, recent history and camera/internet requirements. Upgrade links now open Finance's plan tab directly.
- QR Studio: product-label cross-link, explicitly preserving QR creation on every plan.
- General FAQ, a vendor tutorial and Rex's platform knowledge: consistent eligibility and instructions. Rex directs vendors to review and confirm in the workspace; no new AI action is added.
- Existing dashboard navigation and Creation Zone shortcuts already described Pro access and remain in place.

Shared wording is in `lib/vendor/stock/copy.ts`. Access remains active Pro within the existing paid-period policy. Vendors search/filter physical products or scan existing product labels, select exact options, add quantities and confirm a reviewed batch. The tool displays the last ten adjustments. Internet is required; camera use needs HTTPS, a supported browser and permission. These descriptions make no offline synchronization or universal device support claim.

## Scope and review

No prices, commissions, plan limits, subscription records, stock transaction logic, QR decoder/camera logic, access predicate, financial records or database migrations change. Ordinary product management, stock editing and QR Studio label creation remain available on every plan. The stock feature does not create orders, invoices or payments.

Review the diff against the production base above. Checks cover public/onboarding plan consistency with the real access rule, current configured prices, plan-tab links, QR/access behavior and compiled HTTP output for pricing, features, FAQ, Free/Pro QR Studio, Finance and stock access. Integration fixtures are restricted to the disposable local test database. Production verification uses read-only HTTP and deployment metadata; no live inventory is deducted.

Validation passed: workspace/pricing regression checks, all 15 QR/access/lifecycle checks, full TypeScript, scoped ESLint, whitespace checks, optimized Next.js build and seven compiled HTTP scenarios. The HTTP suite also rechecked ordinary Free product access, server rejection of Free stock actions and concurrent repeated-submit protection. No schema or inventory-service change required a new database migration.

The previous production deployment is `dpl_FbQeCiAovZtbVEhVTrbgEMEyiFz2`. This copy release requires no migration. Deployment identifiers, validation results and live page checks are recorded in the task's `linkwe-stock-copy-*` evidence files. No browser or GUI control is used; phone-camera and visual QA remain outside this copy-only verification.
