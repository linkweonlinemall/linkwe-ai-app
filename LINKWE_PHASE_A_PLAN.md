# LinkWe — Phase A Live Plan
**Last updated:** April 13, 2026
**Active phase:** Phase A — Foundation
**Rule:** Nothing from Phase B or beyond is permitted until all four Phase A steps are complete and reviewed.

---

## Phase A Step Tracker

| Step | Description | Status |
|------|-------------|--------|
| A1 | Fix courier onboarding completion and routing | 🟡 In Progress |
| A2 | Add vendor store edit page | ⬜ Not Started |
| A3 | Verify dashboard gating for all three user roles | ⬜ Not Started |
| A4 | UI consistency pass over auth, onboarding, and dashboards | ⬜ Not Started |

**Status key:** ⬜ Not Started · 🟡 In Progress · 🔴 Needs Review · ✅ Complete

---

## Step A1 — Courier Onboarding Completion + Routing

**Goal:** A courier can complete a two-step onboarding flow, have their progress saved, and land on their dashboard on every subsequent login. Incomplete couriers are always redirected back to the correct onboarding step.

**What was decided:**
- No new schema model was needed. The existing `courierOnboardingStep` field on the `User` model is used (Int, default 0, max 2).
- Step 1 collects: region (saved to User.region)
- Step 2 collects: phone (saved to User.phone)
- Vehicle type and bio were intentionally excluded — no schema fields exist for them yet. They are deferred to Phase B.
- Onboarding lives at `/dashboard/courier/onboarding?step=1` and `?step=2`
- Completion redirects to `/dashboard/courier`

**Files created by Cursor:**
| File | Purpose |
|------|---------|
| `app/actions/courier.ts` | Server action that saves each onboarding step and redirects |
| `app/(dashboard)/dashboard/courier/layout.tsx` | Checks login, role, and onboarding completion on every courier page |
| `app/(dashboard)/dashboard/courier/courier-route-guard.tsx` | Client guard that prevents redirect loops on the onboarding path |
| `app/(dashboard)/dashboard/courier/onboarding/page.tsx` | Two-step onboarding form with step indicator |

**Fix still needed:**
- `lib/auth/landing.ts` — the COURIER block must be updated to point to the new onboarding route instead of the old `/onboarding/courier` path.

**Old code (to be replaced):**
```ts
return nextCourier === 2 ? "/onboarding/courier?step=2" : "/onboarding/courier";
```

**New code:**
```ts
return nextCourier === 2
  ? "/dashboard/courier/onboarding?step=2"
  : "/dashboard/courier/onboarding?step=1";
```

**Test checklist for A1:**
- [ ] Create a fresh user with role COURIER
- [ ] Log in — confirm you are redirected to `/dashboard/courier/onboarding?step=1`
- [ ] Complete step 1 (region) — confirm redirect to `?step=2`
- [ ] Refresh on step 2 — confirm you stay on step 2, not sent back to step 1
- [ ] Complete step 2 (phone) — confirm redirect to `/dashboard/courier`
- [ ] Log out and log back in — confirm you land directly on `/dashboard/courier`
- [ ] Check the database — confirm `courierOnboardingStep = 2` on the user record
- [ ] Log in as a vendor — confirm you are NOT sent to courier onboarding
- [ ] Log in as a customer — confirm you are NOT sent to courier onboarding

---

## Step A2 — Vendor Store Edit Page

**Goal:** A vendor can edit their store's basic profile through a dedicated edit page.

**Fields in scope for Phase A:**
- Store name
- Slug (with uniqueness check and public URL preview)
- Tagline
- Region (Trinidad & Tobago dropdown)
- Category (dropdown)
- Logo (single image upload)

**Fields explicitly deferred to Phase B:**
- Business description
- Gallery (10 images max)
- Opening hours
- Search tags
- Amenities
- Store policies
- Bank details

**Status:** Not started. Will begin after A1 is complete and reviewed.

---

## Step A3 — Dashboard Gating Verification

**Goal:** Confirm all three user roles route correctly after login and cannot access each other's protected sections.

**Expected routing:**
| Role | After login | If onboarding incomplete |
|------|-------------|--------------------------|
| CUSTOMER | `/shop` | No onboarding required |
| VENDOR | `/dashboard/vendor` | Redirect to `/onboarding/business/step-1` |
| COURIER | `/dashboard/courier` | Redirect to `/dashboard/courier/onboarding?step=1` |
| ADMIN | `/dashboard/admin` | No onboarding required |

**Status:** Not started. Will begin after A2 is complete and reviewed.

---

## Step A4 — UI Consistency Pass

**Goal:** Auth, onboarding, and dashboard shells look and feel like one coherent product.

**In scope:**
- Shared layout shell with consistent nav
- Consistent form input styles, labels, error states, button treatment
- Step indicators on both vendor and courier onboarding flows
- Empty states for vendor dashboard (no listings) and courier dashboard (no assignments)

**Explicitly out of scope:**
- Dark mode
- Animations
- Mobile responsiveness beyond basic usability
- Any new data or business logic

**Status:** Not started. Will begin after A3 is complete and reviewed.

---

## Known Issues Log

| # | Issue | Discovered | Status |
|---|-------|------------|--------|
| 1 | Vehicle type has no schema field — courier onboarding step 1 collects it in UI only, does not save | A1 build | Deferred to Phase B |
| 2 | Bio/note has no schema field — courier onboarding step 2 collects it in UI only, does not save | A1 build | Deferred to Phase B |
| 3 | `lib/auth/landing.ts` still points courier onboarding to old `/onboarding/courier` route | A1 build | Fix in progress |

---

## Deferred Items — Phase B and Beyond

These came up during Phase A work. They are noted here so they are not forgotten and do not creep into Phase A.

| Item | Reason deferred | Target phase |
|------|----------------|--------------|
| Courier vehicle type field (schema) | No User field exists yet | Phase B |
| Courier bio/note field (schema) | No User field exists yet | Phase B |
| Courier identity document upload | Out of Phase A scope | Phase D |
| Courier operating area / delivery capacity | Out of Phase A scope | Phase D |
| Vendor bank details (bank name, account name, account number) | Out of Phase A scope | Phase B |
| Vendor gallery (10 images) | Out of Phase A scope | Phase B |
| Vendor opening hours | Out of Phase A scope | Phase B |
| Vendor store policies | Out of Phase A scope | Phase B |

---

## Key Architecture Decisions Log

These decisions are settled. Do not revisit them during Phase A.

| Decision | Reasoning |
|----------|-----------|
| Courier onboarding state stored on `User.courierOnboardingStep` (not a separate CourierProfile model) | Field already existed, no migration needed for Phase A |
| Role-based routing handled in dashboard layout files, not middleware | More reliable — middleware runs before session is fully hydrated |
| Slug sanitization happens server-side (lowercase, hyphens) | Prevents bad data entering the database |
| Dormant models (SplitOrder, Shipment, etc.) must never be deleted | Required for Phase D operations — removing them now would cause major rework later |
| Server Actions for all mutations, no API routes | Consistent with project stack, simpler mental model |

---

## ChatGPT Sync Block

_Paste this into ChatGPT at the start of any session to bring it fully up to date._

---

> LinkWe Phase A status update — April 13, 2026
>
> Step A1 (courier onboarding) is in progress. Cursor built four files: the server action, layout with gating, client route guard, and the two-step onboarding page. One fix still needed: lib/auth/landing.ts must be updated to point the courier routing to /dashboard/courier/onboarding?step=1 instead of the old /onboarding/courier path. After that fix is committed, the full A1 test checklist runs.
>
> Steps A2, A3, and A4 have not started.
>
> Known issues: vehicle type and bio fields have no schema columns — UI collects them but does not save. Both deferred to Phase B.
>
> Current task: complete the landing.ts fix, commit A1, run the test checklist, report back to Claude for review.

---

## How to use this file

- This file lives in the root of your LinkWe project as `LINKWE_PHASE_A_PLAN.md`
- Upload it to your Claude project source files so Claude always has the current plan
- Update the Step Tracker table and Known Issues log after every step
- Replace the ChatGPT Sync Block date and content after every session
- Never delete completed steps — mark them ✅ and keep the record
