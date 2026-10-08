# Team, Orders and Rex release — 8 October 2026

Redesigns Admin Orders with actionable queues, global search and filters, matching exports, and a readable white order details drawer. Enhances vendor team management with assignment suggestions and permission-controlled staff access. Extends Rex field discovery and editing to service expectations, supported product and service settings, and existing ticket inclusions.

## Release scope

Built on production commit `2d8d96b8385f8f35fe69447b9c3a4ee722b67a6d`. Every modified file matched its pre-change baseline in production before the release was assembled. Unrelated local changes, environment files, generated assets and development fixtures are excluded. No new package or production setting is required.

The additive `20261008010000_staff_access` migration creates the staff access table and its indexes and foreign keys. The existing production build applies it before compiling. Existing staff and booking data remain intact. Owners generate invitations and share them themselves; no invitation emails are automatically sent. Invitations require a matching verified account, expire after seven days, and support replacement and revocation. Team access does not change the user's account role.

Rex uses shared editable-field metadata and validation. Service expectations are limited to 1,500 characters each. Changes preserve omitted fields, protect ownership and system fields, enforce existing plan rules and reject stale product/service edits. Ticket inclusions update the existing ticket tier. Photo, file and other dedicated workflows retain their existing controls.

## Verification

The isolated release passed team/order integration checks, Rex field saves and simulated conversations, 19 Studio checks, Rex workspace checks, staff scheduling checks, scoped lint and whitespace checks. Database tests use the loopback development database and roll back every write; AI and outbound providers are simulated. Lint reports one existing unused-helper warning in event actions and no errors.

The implementation was also checked in the local browser: order queues/search, desktop and 390-pixel order details, staff assignment conflicts, the staff portal, permission-controlled appointment notes, and the three Admin service expectation fields. The final optimized Next.js build and deployment status are recorded with the release evidence.

## Publication

The user explicitly requested publication. The release evidence records the published commit, deployment status and live checks. Authenticated production workflows require an authorized signed-in session; no development accounts are used on production.
