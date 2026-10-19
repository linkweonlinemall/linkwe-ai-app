# Vendor Academy review

Prepared 2026-10-19 on `codex/vendor-learning-center`, based on analytics release
`d890f57d33e06b4980667492d41d3271a7f23904`. This change is ready for code and product
review. It has not been pushed or deployed.

## Result

The former flat library of 33 tours is now 36 practical lessons with 188
checkpoints, arranged into four learning paths: setup, first offer, customer work,
and business operations. Search covers titles, instructions and access information,
with direct title matches first. Each lesson states preparation, access rules,
what to do, where to do it, what to check and how to recover when a control is absent.

The companion sits beside the real workspace. Users can type into the real form,
select options and move through a lesson without losing their entries. “Work on
this step” focuses and highlights a visible section or field; it never activates
a control. On smaller screens and inside editor dialogs it collapses to a resume
bar while the user works. It moves into open native dialogs so it remains usable
in the coupon editor. Step changes reset the instruction scroll position.

Navigation is explicit and includes an unsaved-work notice. No route effect
redirects users when they select a record, change filters or open an editor.
The guide never chooses the first record, clicks Publish, submits a form or
claims a save succeeded. Reviewing a checkpoint records learning separately.

## Accuracy audit

| Topic | Verified source and resulting guidance |
| --- | --- |
| Creation forms | Product form, `ServiceCreateForm`, `EventCreateForm`, `CreationEditorShell`; section selectors and actual service-type names replace stale targets. |
| Store profile | Store edit page and `StoreIdentityFields`; logo has its own target, gallery additions/removals save separately from profile Save changes. |
| Service work | `ServiceDesk`; users choose their own record and retain its query parameters and filters. Empty queues have a useful explanation. |
| Pay on arrival | `lib/services/payment-policy.ts`; active Services, Growth or Pro required. Corrected the contradictory create/edit form helper text as well. Virtual services remain online-only. |
| Live stock | `lib/vendor/stock/access.ts`; active Pro within the paid period. Staging, reduction and uncertain-request retry have distinct instructions. |
| Photo Studio | `lib/photo-studio/access.ts` and `PhotoStudio`; unused lifetime trial or active Growth/Pro with usage limits; fine-tuning follows processing. |
| QR Studio | Existing label workflow; ordinary labels remain available across plans, while stock deduction requires Pro. |
| Store coupons | `CouponManager` and coupon actions; unlimited redemptions, eligible minimum before delivery, Trinidad expiry, selected-event coverage and subscription first-payment restriction. |
| Event tickets | `TicketEditor`, `TicketTypesClient`, `PromoCodesPanel`; actual tier fields, visibility, sales window and event-specific optional usage cap. |
| Event entry | `CheckInScanner`; lookup does not admit a guest, Confirm & admit does. Offline guidance includes 24-hour availability, independent device lists and syncing. |
| Finance | Existing Finance tabs; payout request is in Overview, payout history is separate, and gross sales are not available balance. |
| Other workspaces | Source review of shipping, messages, reviews, staff/availability, support, settings, Timeline, Collab, reports, Guided Creation and Rex. No new capability or fixed plan price is promised. |

All lesson destinations and targets are in `lib/vendor/tutorial-catalog.ts`.
Dynamic records are opened by the user; the catalogue contains no real customer,
store, ticket or order identifiers.

## Progress and accessibility

Progress is stored locally per store under `linkwe-academy:v3:<storeId>` using
stable checkpoint IDs. Active guidance uses session storage. Skipping a step
does not mark it reviewed. Invalid or blocked storage falls back without
preventing access to lessons.

The old unscoped/index-based progress is left untouched and is not migrated into
the reordered lessons. Existing users begin the new checkpoint structure fresh.
Progress is not synchronized across browsers or devices.

The library uses a native modal dialog with focus restoration. The companion is
non-modal. Keyboard users can reach the real field, move between steps and pause
with Escape; the guide does not intercept Escape from an enclosing editor dialog.
Controls have labels and visible focus styles. Reduced-motion preferences are
respected when locating a section. No screen-reader or physical-device audit was
performed.

## Motion refinement after user testing

The Academy and companion now use a shared easing curve with a 260 ms panel
transition, 180 ms content transition and 140 ms exit. The library and backdrop
enter/leave together, and choosing a lesson finishes the short exit before opening
the companion. Category/view changes fade only the results area; the search field
stays mounted. Step content transitions in place without remounting form controls.

Collapse/expand animates the companion's measured position and size without scaling
text. Rapid actions replace the previous animation instead of queuing motions.
Desktop workspace spacing transitions with the panel. Manual minimize transfers
keyboard focus to the resume button; Work on this step keeps focus on the real
field and waits for compact layout before scrolling the minimum distance needed.
If focus moves elsewhere in the meantime, the guide does not pull it back.

Reduced-motion preferences skip these transitions, including when the preference
changes during a running animation. Four database-free motion checks cover reduced
motion, unavailable animation support, interrupted exits, retained fixture values,
preference changes and listener cleanup. Browser animation review is pending: the
user retained Chrome ownership throughout this refinement. No automated reload or
browser interaction was performed.

## Verification

Run the database-free checks with:

```sh
node scripts/test-vendor-tutorials.cjs
node scripts/test-vendor-tutorial-motion.cjs
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint components/vendor/TutorialLibrary.tsx components/vendor/VendorGuidedTours.tsx lib/vendor/tutorial-catalog.ts lib/vendor/tutorial-navigation.ts lib/vendor/tutorial-progress.ts scripts/test-vendor-tutorials.cjs
git diff --check
```

Nine regression checks cover lesson completeness, learning-path coverage,
existing static routes, source-backed selectors, query preservation, relevant
search, stable progress, store isolation, corrupt/blocked storage and the absence
of automatic click/submit/navigation behavior. Selector presence is a structural
check; it does not prove every data-dependent state has rendered in a browser.

A production `next build --webpack` was also run with local placeholder
configuration, no production credentials, and webpack disk caching temporarily
disabled to fit the available disk space. The original Next configuration was
restored afterward. The repository's production npm build wrapper was not used
because it can run migrations. No migrations were run.

Browser review used Chrome at desktop width and a 390 × 844 viewport, through a
localhost-only fixture harness outside the application repository. The harness
mounts the actual Academy, ProductForm, StoreIdentityFields, CouponManager and
ServiceDesk with synthetic data; it blocks form submission. No live data was
created or modified. Verified journeys:

- Browse paths, title-ranked search, empty results and recovery.
- Open a destination only after the explicit unsaved-work notice.
- Type into store identity and the variable-product form, then advance the lesson
  while retaining entered values. Selecting the product type remains the user's action.
- Focus the actual coupon code field inside its native dialog, enter a synthetic
  value, collapse/resume guidance, and close the editor without losing the lesson.
- Return keyboard focus after closing the library; keep the editor's Escape behavior.
- Preserve Service Desk `type=request` and the search query while guidance remains active.
- Restore the selected checkpoint and compact state after reload.
- Read mobile instructions, collapse the guide and type into the actual workspace search.

Authenticated production follow-up checked dashboard setup labels, Finance tabs,
the existing account's past-due plan state, the Live stock access gate, the unused
Photo Studio trial, existing product and appointment-service editors, saved-event
tickets/promotions navigation and the attendee workspace. Service Desk and the
event attendee list were empty, so record actions remain covered by local fixtures
and source review. No live fields or records were changed. The visible past-due
message is rendered only for `PAST_DUE`; the plan name alone does not prove active
paid access. The active-plan matrix was verified independently with local tests.

This review corrected the exact dashboard labels (Store setup & verification,
Store profile, Quick actions and View public store). It also replaced an inaccurate
instruction to request store approval with the existing Go live flow after identity
approval and email verification. Both the normal and Rex shell now reserve desktop
space for the expanded companion.

The local fixture was then mounted inside the actual VendorDashboardShell, and the
Academy was visually checked with its sidebar and top bar. This working preview was
handed to the user at `http://127.0.0.1:3167/dashboard/vendor/creation/new?type=product`
with the Academy open. Browser automation stopped for the user's test. The earlier
desktop/mobile companion checks used the simpler fixture wrapper; final companion
spacing at the production shell's narrow desktop and mobile breakpoints remains
to be checked after the user finishes. Browser DOM actions were intermittent;
native Chrome controls and browser screenshots provided the visual evidence.
This is not a claim that all 188 authenticated targets were visually tested.

## Review boundaries

The analytics working tree was not edited. The help branch starts on its latest
released base and changes no analytics code, tracking configuration, schema,
permissions or credentials. No account changes, publishing, payouts, real coupon
saves, stock deductions, customer messages or ticket admissions were performed.

Before a production release, finish the actual-shell companion breakpoint checks
and perform an authenticated staging smoke test of the new guide with existing
records across active plan states. The new guide is not deployed, so production
checks verify existing destinations and labels rather than the new integration.
Camera, offline synchronization, payments and external uploads were source-reviewed
but not executed. The live check-in scanner was not opened because it can sync a
previously queued offline admission batch. Publication remains a separate approval
boundary.
