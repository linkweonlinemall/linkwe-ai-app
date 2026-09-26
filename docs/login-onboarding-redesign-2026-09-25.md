# Login and onboarding refresh

Implemented locally on 25 September 2026. Not deployed.

## What changed

- Login, account choice, customer signup, business signup, password recovery and email verification share an ivory-and-forest design with local imagery, clear labels, responsive layouts and gentle entry transitions. Reduced-motion preferences are respected.
- The account chooser links directly to customer or business registration. Password visibility, autofill and Google sign-in are preserved. Errors receive focus, submission buttons show progress, and registration terms are checked on the server.
- Business setup uses four consistent stages: Your plan, About you, Identity and Storefront. Earlier steps can be revisited; the previous redirect loop that blocked Back is fixed.
- Phone is visibly optional, matching the existing server rules. Both local seven-digit and country-code formats are accepted.
- Identity includes a distinct **Skip for now** button. It calls a separate action with no upload fields, leaves verification status unchanged, and continues to storefront setup. The dashboard checklist still requires identity verification before launch.
- ID and selfie files must be supplied together when submitting. Both are checked before uploading: JPG, PNG or WebP, with PDF also accepted for ID documents, up to 3 MB each. Existing submitted/approved documents do not need to be uploaded again.
- Storefront setup provides a live preview, an automatically suggested link, grouped category selection, region, optional logo and a selected-plan summary. Only non-sensitive storefront text is saved in session storage, scoped to the account and browser tab; identity documents and passwords are never included.
- Starter continues to the dashboard without subscription checkout. Existing Growth/Pro checkout happens after saving the draft storefront. Replaying completed setup cannot reset an established store to draft or start another checkout.
- Signing out and finishing setup clear onboarding plan cookies. A new registration also starts with clean plan preferences.

## Verification

- TypeScript and targeted ESLint checks passed.
- Production build passed.
- `scripts/test-onboarding-actions.cjs`: transaction-backed local integration coverage for role/auth guards, required details, optional phone, plan selection, skip semantics, file type/size/pair validation, category validation, slug collisions, draft creation, public visibility rules, replay protection, paid checkout ordering, terms and duplicate registration. All writes roll back; uploads, emails and checkout are simulated.
- Browser: desktop and 390px mobile layouts; incorrect login followed by recovery; choosing a plan; saving personal details without a phone; Back restoring saved details; skipping ID; live preview and automatic link; returning to plan selection; storefront draft restoration; duplicate-link error retaining entries; completing setup into the vendor dashboard; and the remaining Upload ID checklist.
- Local preview account: `onboarding-preview@linkwe.test`, created with `scripts/onboarding-preview.mjs`; resulting store is `island-beginnings-preview`, a draft with unsubmitted identity verification.

Google OAuth, email delivery, real identity uploads and real payments were not exercised against external providers. Existing PhotoRoom behavior and the proposed TT$100 services package were not changed.
