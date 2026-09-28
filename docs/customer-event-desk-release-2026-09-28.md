# Customer access, Timeline and Event Desk release — 28 September 2026

Built on production commit `894e0d6d5679fc4a61094315db59db534e87cf05`.

## Changes

- One existing customer account can enable a business workspace while retaining shopping history. Vendors can open My Dashboard and use their shopping inbox. Removed repeated vendor signup promotions from customer navigation and the homepage.
- Shared fitted Timeline galleries with fullscreen viewing, plus a redesigned vendor studio with previews, drafts, search and visibility filters.
- Public events and customer tickets identify the store as host. Internal organiser names remain private in vendor forms and are excluded from public search.
- Redesigned check-in and attendee pages: manual ticket-number lookup, explicit admission, staff code rotation/revocation, offline preparation/sync, status/type filters, progress, CSV export and duplicate audit.
- Admission and its audit entry commit together. Concurrent gates cannot admit one ticket twice. Offline retries are idempotent; failed device writes do not report admission success.

## Release boundaries

No schema migration or new configuration is required. Only the 60 application/test files changed for this request are included, plus this note. Local preview seed scripts, accounts/events, credentials, screenshots and uploads are excluded. No live payments, messages, tickets or admissions are submitted during deployment checks.

## Validation

The release checkout passes the Event Desk integration suite, 17 event detail checks and the existing Rex/Services regression suite. Tests use the local development database with cleanup/rollback. The optimized production build is checked before publication.

Local browser checks verified shopping access for a vendor account, Timeline draft persistence and image fitting, attendee search and admission confirmation. Physical camera capture still needs a real-device check. Offline devices cannot share admissions while disconnected; use one offline gate per ticket list and reconnect regularly. Cached offline access lasts 24 hours.
