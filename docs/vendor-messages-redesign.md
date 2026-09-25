# Vendor Messages workspace

Local implementation, 25 September 2026. Not deployed.

## Experience

- Vendor inbox and conversation pages share a cream, forest-green and orange workspace. CSS chat sculptures, soft gradients, inset highlights and raised cards add depth without heavy image or 3D dependencies.
- Desktop uses a split inbox/conversation view. Short laptop screens get a compact header. Mobile conversations use the available height, with an always-accessible composer and a back-to-inbox link. The secondary floating AI chat and mobile bottom bar do not overlap the conversation.
- Search names/recent messages; filter All, Unread or Needs reply; sort newest, oldest or name. Needs reply means the most recent message came from the customer, not a manually tracked resolution state. Filters and sort survive navigation in the same browser tab.
- Inbox refreshes every 15 seconds and the open conversation every 6 seconds while visible. Connection errors retain the current content and draft and offer retry. Presence is labelled “Active recently”, not guaranteed online.
- Search the full loaded conversation with highlighted matches and previous/next navigation. Date/time display uses Trinidad and Tobago time. New messages do not force a reader away from older messages.
- Quick replies insert editable text; they never send automatically. Drafts are scoped to the signed-in user/conversation and stored in sessionStorage in the current browser tab, when available. Drafts are not shared across devices.
- Auto-growing composer, 5,000-character limit, desktop Enter/Shift+Enter behavior with IME protection, mobile send button, pending-send guard, recoverable send errors, safe links, and sent-state indicators. Does not claim message read receipts.
- Customer details show up to five recent product orders and three each of bookings, quotes and subscriptions, linked to existing vendor order pages. Queries restrict records to the owned store/customer pair.
- Built-in Messages tour now explains the actual filters, customer context, drafts and keyboard behavior.

## Reliability and access

Server-rendered/prefetched vendor conversations no longer mark themselves read. The visible focused client acknowledges a snapshot; an older timestamp cannot clear a newer conversation update. Reads, sends and customer context check store ownership.

Optional client-generated UUID message IDs make retries idempotent: one message, one unread increment, one notification. Retry references can survive uncertain responses across navigation/reload. Existing customer/admin callers remain compatible with the shared actions. No database migration is needed.

This adds no image attachments, archiving or fabricated customer records in production. The preview seed script operates only on localhost/127.0.0.1 linkwe_dev and inserts sample messages directly without notification APIs.

## Validation

- `node scripts/test-vendor-messages.cjs`: filtering, sorting, search, unread snapshot guard, merge deduplication, scoped draft keys, local dates, presence and link parsing.
- `node scripts/test-vendor-message-actions.cjs`: real local database queries inside an always-rolled-back transaction, with notifications stubbed. Checks ownership, anonymous denial, stale read snapshots, render-without-reading, idempotent sends, validation, customer compatibility and related order context.
- TypeScript and scoped ESLint pass. Production build completes, including 109 static pages.
- Browser checks: desktop and 1280×720 laptop; 390×844 and 320×740 mobile. Verified no horizontal overflow, visible composer, inbox filters/search, alphabetical sort, filter persistence, draft restoration after switching chats, quick reply insertion, conversation search/next match and customer order links. No messages sent through the browser.
- Local preview contains six clearly labelled sample conversations. The test draft was cleared.

## Changed scope

`components/vendor/messages/*`, vendor Messages route pages and tab adapter, `lib/messages/vendor-inbox.ts`, `lib/vendor/message-context.ts`, messaging server actions, small conditional vendor-shell adjustments and Messages tutorial copy. Test/preview scripts live under `scripts/`.

The working tree also contains earlier unrelated work. Review deployment scope against the last published vendor release; do not deploy the entire dirty working tree without that review.
