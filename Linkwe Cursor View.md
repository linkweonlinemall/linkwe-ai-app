# LinkWe — Cursor View (Technical Snapshot)

**Generated:** 2 June 2026  
**Purpose:** Standalone reference for AI assistants — describes LinkWe as it exists in this repository *right now*, read from actual code.  
**Repo:** `linkwe-ai-app` · Production URL: `https://www.linkweonlinemall.com`

---

## 1. What LinkWe Is

LinkWe is a multi-vendor online marketplace and events platform built for **Trinidad & Tobago**, where local vendors sell physical products, bookable services, and event tickets, and customers shop, book, and track orders in TTD.

**Business model:** Vendors operate branded stores on the platform. Customers browse a unified storefront (`/shop`, `/search`, store pages), add items to cart, pay via **Stripe** (TTD minor units), and receive per-vendor **split orders** for fulfillment. The platform earns revenue through **tiered commission** on product/service/booking sales, a flat **6% ticket commission**, and **LinkWe delivery fees** (when `Store.shippingMode = LINKWE`). Vendors can also run **events & ticketing** on a separate rail (`TicketOrder`, not `MainOrder`).

**User roles (active):**
| Role | Purpose |
|------|---------|
| **CUSTOMER** | Shop, checkout, orders, bookings, tickets, wishlist, AI shopping chat (Zara) |
| **VENDOR** | Store, products, services, events, fulfillment, finance, Rex AI assistant |
| **ADMIN** | Operations: orders, LinkWe delivery queue, payouts, verification, moderation |

**COURIER role:** Still in schema, auth, and legacy code paths (`Shipment`, courier dashboard, warehouse inbound pickup). **Retired/dormant** for the current direct vendor→customer shipping model. Courier onboarding/register routes exist but are not part of active ops.

**Value proposition:** One T&T-local mall connecting many vendors with integrated checkout, per-store shipping (self-deliver or LinkWe-deliver), vendor earnings ledger, admin delivery manifest (CSV + PDF), events/ticketing with QR/PDF/offline check-in, and AI assistants for shopping and vendor operations.

---

## 2. Tech Stack

From `package.json` (versions as pinned/ranged in repo):

| Package | Version | Role |
|---------|---------|------|
| **next** | ^16.2.6 | App Router, Server Actions, API routes, Turbopack build |
| **react** / **react-dom** | ^19.2.6 | UI |
| **typescript** | ^5 | Language |
| **@prisma/client** / **prisma** | ^5.22.0 | ORM, migrations, PostgreSQL access |
| **PostgreSQL** | via `DATABASE_URL` | Primary DB (Neon in production per project notes) |
| **tailwindcss** | ^4 | Styling (`@tailwindcss/postcss`) |
| **stripe** | ^22.0.2 | PaymentIntents, webhooks |
| **@stripe/react-stripe-js** / **@stripe/stripe-js** | ^6.2 / ^9.2 | Client Stripe Elements |
| **@anthropic-ai/sdk** | ^0.91.0 | Zara (customer) + Rex (vendor) chat |
| **@react-pdf/renderer** | ^4.5.1 | Server-side PDFs (invoice, vendor invoice, tickets, LinkWe manifest) |
| **cloudinary** | ^2.9.0 | Image uploads (vendor products, events, chat image tools) |
| **resend** | ^6.12.3 | Transactional email |
| **jose** | ^6.2.2 | JWT session signing/verification |
| **bcryptjs** | ^3.0.3 | Password hashing |
| **mapbox-gl** / **react-map-gl** | ^3.22 / ^8.1.1 | Maps (checkout/store) |
| **@react-google-maps/api** | ^2.20.8 | Google Maps (directions links on delivery cards) |
| **leaflet** | ^1.9.4 | Admin map tab (dormant from nav) |
| **qrcode** | ^1.5.4 | Order + ticket QR data URLs |
| **html5-qrcode** | ^2.3.8 | Offline ticket scanning |
| **idb** | ^8.0.3 | Offline check-in IndexedDB queue |
| **zustand** | ^5.0.12 | Client state (e.g. cart) |
| **@tiptap/** | ^3.23.4 | Rich text (product descriptions) |
| **recharts** | ^3.8.1 | Vendor analytics charts |
| **exceljs** / **papaparse** / **csv-parse** | various | Bulk import/export |
| **lucide-react** / **@tabler/icons-react** | various | Icons |
| **sonner** | ^2.0.7 | Toasts |
| **react-markdown** | ^10.1.0 | Chat markdown rendering |
| **canvas-confetti** | ^1.9.4 | Celebration UI |
| **react-day-picker** | ^10.0.0 | Date picking |

**next.config.ts highlights:**
- `typescript.ignoreBuildErrors: true` — production build skips TS type errors
- `serverExternalPackages: ["@prisma/client", "@prisma/engines"]`
- `experimental.serverActions.bodySizeLimit: "50mb"`
- Security headers (HSTS, X-Frame-Options, etc.)
- `images.remotePatterns`: Cloudinary, Google user content

**Database:** PostgreSQL via Prisma (`prisma/schema.prisma`). Migrations in `prisma/migrations/`.

---

## 3. Architecture Overview

### App Router structure

Route groups (from `app/` tree):

| Group | Path prefix | Purpose |
|-------|-------------|---------|
| Root | `/`, `/shop`, `/cart`, etc. | Public storefront + customer pages |
| `(auth)` | `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth forms |
| `(app)` | `/onboarding/*` | Post-signup onboarding (customer, vendor, business steps, courier) |
| `(dashboard)` | `/dashboard/*` | Role dashboards (customer, vendor, admin, courier) |
| `(storefront)` | `/stores`, `/stores/[slug]` | Store discovery |
| `vendor` | `/vendor/store/setup` | Legacy vendor setup path |

### Mutation pattern

**Server Actions** (`"use server"` in `app/actions/*.ts`) are the default for form submissions and mutations. API routes are used for: Stripe webhooks, cron, AI streaming chat, PDF generation, search, contact form, booking checkout.

### Database access

**Prisma only** — `import { prisma } from "@/lib/prisma"`. No raw SQL in application code.

### Auth & session

- **JWT in httpOnly cookie** (`SESSION_COOKIE_NAME` from `lib/auth/constants`)
- Signed with **HS256** via `jose` (`lib/auth/token.ts`), 7-day max age, `AUTH_SECRET` env (≥32 chars)
- Claims: `userId` (sub), `email`, `fullName`, `role`
- Server: `getSession()` (`lib/auth/session.ts`, React `cache`)
- Login/register: `app/(auth)/auth-actions.ts` → `createSessionFromUser`

### Route protection (`proxy.ts`)

Next.js 16 **proxy** (not `middleware.ts`) protects:
```
matcher: ["/dashboard/:path*", "/onboarding/:path*", "/vendor/:path*"]
```
Unauthenticated users → redirect `/login?callbackUrl=...`. Invalid token → cookie cleared, redirect login.

**Role-based routing** is enforced in **dashboard layouts** (e.g. vendor layout checks `user.role !== "VENDOR"`), not in proxy.

### Key patterns

- **Money:** integer **minor units** (TTD cents) on orders/ledger; Stripe `amount` in minor units, `currency: "ttd"`
- **PDFs:** API route → `renderToBuffer` from `@react-pdf/renderer` → `NextResponse` with `application/pdf`
- **Revalidation:** `revalidatePath` after mutations
- **Notifications:** `createNotification` → `Notification` model → `NotificationBell` UI

---

## 4. Database Models

Schema: `prisma/schema.prisma`. PostgreSQL, `cuid()` IDs unless noted.

### ACTIVE — core commerce

| Model | Purpose | Key fields |
|-------|---------|------------|
| **User** | All accounts | `email`, `passwordHash`, `fullName`, `role`, `region`, `idVerificationStatus`, bank fields, `courierOnboardingStep` |
| **Store** | Vendor shop | `ownerId`, `name`, `slug`, `region`, `status`, `shippingMode`, `subscriptionPlan`, `onboardingStep` |
| **VendorShippingRate** | SELF-mode zone rates | `storeId`, `zone`, `rateMinor`, `active` |
| **VendorBankDetails** | Payout bank info | `userId`, `bankName`, `accountName`, `accountNumber` |
| **VendorThreshold** | Min payout amount | `storeId`, `minimumAmountMinor` |
| **VendorLedgerEntry** | Vendor money ledger | `storeId`, `entryType`, `ledgerEntryType`, `amountMinor`, `grossMinor`, `commissionMinor`, `netMinor`, `splitOrderId`, `idempotencyKey` |
| **Product** | **Primary catalog** | `storeId`, `name`, `slug`, `price`, `stock`, `images`, `weight`, `isDigital`, `isBookable`, `isPublished`, `hasVariants` |
| **ProductVariant** | Variable products | `productId`, `name`, `price`, `stock`, `attributes` |
| **ProductCartItem** | **Active cart** | `userId`, `productId`, `productVariantId`, `quantity` |
| **MainOrder** | Checkout order | `buyerId`, `status`, `region`, `shippingZone`, `subtotalMinor`, `shippingMinor`, `totalMinor`, `shippingAddressId`, `referenceNumber` |
| **OrderItem** | Line items on MainOrder | `productId`, `storeId`, `titleSnapshot`, `priceMinor`, `quantity`, `weightLbs` |
| **SplitOrder** | Per-vendor fulfillment slice | `mainOrderId`, `storeId`, `status`, `subtotalMinor`, `shippingMinor`, `earningsReleased`, `deliveredAt`, `autoCompleteAt` |
| **SplitOrderItem** | Lines on split | `listingId`, `titleSnapshot`, `quantity`, `unitPriceMinor` |
| **Address** | Delivery addresses | `line1`, `city`, `region`, `phone`, `latitude`, `longitude`, `userId` |
| **PayoutRequest** | Vendor withdrawal requests | `storeId`, `amountMinor`, `status`, `beneficiaryId` |
| **Review** | Product/store/booking reviews | `rating`, `body`, `productId`, `storeId`, `mainOrderId`, `bookingId` |
| **Notification** | In-app notifications | `type`, `title`, `body`, `linkUrl`, `isRead` |
| **Wishlist** / **WishlistItem** | Saved products | `userId`, `productId` |
| **SavedStore** | Followed stores | `userId`, `storeId` |

### ACTIVE — services & bookings

| Model | Purpose | Key fields |
|-------|---------|------------|
| **Product** (bookable flags) | Services share Product model | `isBookable`, `serviceType`, `durationMinutes`, `bookingPaymentMode`, etc. |
| **ProductAvailabilitySchedule** | Weekly slots | `dayOfWeek`, `startTime`, `endTime`, `slotDurationMins` |
| **ProductAvailabilityOverride** | Block/custom days | `date`, `isBlocked` |
| **ProductBookingSlot** | Concrete slots | `date`, `startTime`, `maxBookings`, `currentBookings` |
| **ProductBooking** | Confirmed bookings | `customerId`, `status`, `totalPrice`, `earningsReleased`, `autoCompleteAt` |
| **OnDemandRequest** | Quote/on-demand services | `serviceId`, `customerId`, `status`, `quotedPrice` |
| **Service** | Separate service listings model | `title`, `slug`, `priceType`, `isBookable` — **limited UI** vs Product-as-service |
| **StaffMember** / **StaffAvailability** / **StaffService** | Team scheduling | linked to store + products |

### ACTIVE — events & ticketing

| Model | Purpose | Key fields |
|-------|---------|------------|
| **Event** | Event pages | `storeId`, `slug`, `startDate`, `status`, `coverImage`, `scanCode`, `refundPolicyType` |
| **EventTicketType** | Ticket tiers | `price`, `quantity`, `quantitySold`, `maxPerOrder` |
| **EventTicketCartItem** | Ticket cart (pre-checkout) | `userId`, `ticketTypeId`, `quantity` |
| **TicketOrder** | Paid ticket purchase | `reference`, `status`, `subtotal`, `total`, `stripePaymentIntentId`, `payoutEligibleAt` |
| **Ticket** | Individual ticket | `qrToken`, `ticketNumber`, `holderName`, `status`, `pricePaidMinor` |
| **TicketCheckIn** | Scan audit log | `ticketId`, `scannedAt`, `deviceId`, `outcome` |
| **EventPromoCode** | Discount codes | `code`, `discountType`, `discountValue`, `maxUses` |
| **EventWaitlist** | Sold-out waitlist | `eventId`, `email` |

### ACTIVE — messaging & AI

| Model | Purpose |
|-------|---------|
| **Conversation** / **Message** | Customer↔store messaging |
| **VendorChat** / **VendorChatMessage** | Legacy vendor chat storage |
| **AIChatSession** / **AIMessage** | AI session persistence |
| **RateLimit** | Auth rate limiting |

### ACTIVE — misc

| Model | Purpose |
|-------|---------|
| **StoreImage** | Store gallery positions |
| **ContentLink** | Cross-link products/services/events on store |
| **StoreContentRelationship** | Partner store content sharing |
| **DigitalDownload** | Digital product download tracking |
| **OrderDocument** | Document metadata (invoice etc.) — mostly unused vs on-the-fly PDF routes |

### DORMANT / LEGACY — warehouse & courier era

Kept in schema **non-destructively**; UI largely removed from admin nav.

| Model | Status |
|-------|--------|
| **Warehouse** | Dormant — inbound receiving |
| **WarehouseInventory** | Dormant |
| **WarehouseOrderLine** | Dormant |
| **DockBay** | Dormant — bay assignment |
| **ShippingBundle** | Dormant — bundle before outbound ship |
| **Shipment** | Dormant — courier inbound/outbound legs |
| **CourierBankDetails** | Dormant |
| **CourierLedgerEntry** | Dormant |
| **CourierPayoutRequest** | Dormant |
| **CourierLocation** | Dormant — live map |

Legacy fulfillment actions still in `app/actions/fulfillment.ts`: `chooseCourierPickup`, `chooseVendorDropoff` (warehouse path). Current vendor flow uses `startPreparing`, `markShipped` (SELF), `markReadyForLinkWe` (LINKWE).

### DORMANT / PARALLEL — Listing catalog

| Model | Status |
|-------|--------|
| **Listing** + subtype tables (`ListingProduct`, `ListingRealEstate`, etc.) | **Parallel/legacy** catalog. Split orders still reference `listingId`; `createSplitOrdersFromMainOrder` may auto-create Listing rows from Product. Vendor has Listings tab; **primary storefront uses Product**. |
| **Cart** / **CartItem** | Legacy listing cart — **not** used by current checkout (`ProductCartItem` instead) |

### DORMANT — vertical content models (schema only, no app routes found)

| Model | Status |
|-------|--------|
| **RealEstate** | Schema + relations on Store — no `app/` pages found |
| **Vehicle** | Same |
| **Place** | Same |
| **FoodOutlet** | Same |
| **Accommodation** | Same |

### Key enums

**SplitOrderStatus** (values in schema — many legacy warehouse states retained):
```
AWAITING_VENDOR_ACTION, PREPARING, READY_FOR_LINKWE, VENDOR_PREPARING,
AWAITING_COURIER_PICKUP, COURIER_ASSIGNED, COURIER_PICKED_UP, VENDOR_DROPPED_OFF,
AT_WAREHOUSE, PACKAGED, BUNDLED_FOR_DISPATCH, SHIPPED, OUT_FOR_DELIVERY,
DISPATCHED, DELIVERED, COMPLETED, CANCELLED
```
**Active path:** `AWAITING_VENDOR_ACTION` → `PREPARING` → (`SHIPPED` SELF | `READY_FOR_LINKWE` LINKWE) → `OUT_FOR_DELIVERY` (admin) → `DELIVERED` → `COMPLETED`

**LedgerEntryType:**
```
ORDER_REVENUE, COURIER_PICKUP_FEE, PLATFORM_COMMISSION, PAYOUT, ADJUSTMENT,
BOOKING_COMPLETE, BOOKING_AUTO_COMPLETE, DEPOSIT_RECEIVED, ORDER_AUTO_COMPLETE,
TICKET_SALE, SHIPPING
```

**VendorLedgerEntryType:**
```
CREDIT_ORDER_SETTLEMENT, DEBIT_PAYOUT, DEBIT_REFUND, DEBIT_PLATFORM_FEE,
CREDIT_ADJUSTMENT, DEBIT_ADJUSTMENT, CREDIT_REVERSAL
```

**NotificationType:**
```
ORDER_PLACED, ORDER_STATUS_UPDATED, BOOKING_CONFIRMED, BOOKING_CANCELLED,
ON_DEMAND_REQUEST_RECEIVED, ON_DEMAND_REQUEST_ACCEPTED, ON_DEMAND_REQUEST_DECLINED,
ON_DEMAND_REQUEST_COMPLETED, REVIEW_RECEIVED, PAYOUT_PROCESSED, GENERAL,
TICKET_PURCHASED, MESSAGE_RECEIVED
```

**StoreShippingMode:** `SELF` | `LINKWE`

**VendorSubscriptionPlan:** `STARTER` | `GROWTH` | `PRO`

**MainOrderStatus:** `DRAFT`, `PENDING_PAYMENT`, `PAID`, `PROCESSING`, … `COMPLETED`, `CANCELLED`, `REFUNDED` (includes legacy warehouse statuses)

**UserRole:** `CUSTOMER`, `VENDOR`, `COURIER`, `ADMIN`

**StoreStatus:** `DRAFT`, `PENDING_APPROVAL`, `ACTIVE`

**TicketOrderStatus:** `PENDING_PAYMENT`, `PAID`, `FAILED`, `CANCELLED`

**TicketStatus:** `VALID`, `USED`, `CANCELLED`, `REFUNDED`

---

## 5. Routes

### Public storefront

| Route | Purpose |
|-------|---------|
| `/` | Marketing home |
| `/shop` | Product browse |
| `/search` | Universal search (products, services, stores) |
| `/products/[slug]` | Product detail |
| `/service/[slug]` | Service detail |
| `/listing/[slug]` | Legacy listing detail |
| `/store/[slug]` | Store page (older path) |
| `/stores` | Store directory (`(storefront)`) |
| `/stores/[slug]` | Storefront store page |
| `/events` | Events index |
| `/events/[slug]` | Event detail + ticket purchase |
| `/cart` | Shopping cart |
| `/checkout` | Stripe checkout |
| `/order-confirmation/[orderId]` | Post-purchase confirmation |
| `/orders` | Customer order list |
| `/orders/[orderId]` | Order detail + invoice link + delivery info |
| `/wishlist` | Saved products |
| `/saved-stores` | Saved stores |
| `/bookings` | Customer bookings |
| `/booking-confirmation` | Booking confirmation |
| `/my-tickets` | Purchased event tickets + QR |
| `/my-tickets/[ticketId]` | Single ticket + PDF + transfer |
| `/my-requests` | On-demand service requests |
| `/chat` | Full-page Zara shopping chat |
| `/messages`, `/messages/[conversationId]` | Customer↔store messaging |
| `/contact` | Contact form |
| `/get-app` | PWA install prompt |
| `/privacy`, `/terms` | Legal pages (substantive content) |
| `/offline` | PWA offline fallback |

### Auth

| Route | Purpose |
|-------|---------|
| `/login` | Sign in |
| `/register` | Registration hub |
| `/register/customer` | Customer signup |
| `/register/business` | Business/vendor signup entry |
| `/register/courier` | Courier signup (**dormant**) |
| `/forgot-password`, `/reset-password` | Password reset |

### Onboarding (`(app)/onboarding`)

| Route | Purpose |
|-------|---------|
| `/onboarding/customer` | Customer onboarding |
| `/onboarding/vendor` | Vendor onboarding |
| `/onboarding/courier` | Courier onboarding (**dormant**) |
| `/onboarding/business/step-1` | Business: basics |
| `/onboarding/business/step-2` | Business: KYC/docs |
| `/onboarding/business/step-3` | Business: store creation |
| `/vendor/store/setup` | Alternate store setup |

### Customer dashboard

| Route | Purpose |
|-------|---------|
| `/dashboard` | Role landing (redirects to primary workspace) |
| `/dashboard/customer` | Customer home |
| `/dashboard/customer/settings` | Profile settings |

### Vendor dashboard

| Route | Purpose |
|-------|---------|
| `/dashboard/vendor` | Dashboard + tabs (store, listings) |
| `/dashboard/vendor/products` | Product list |
| `/dashboard/vendor/products/new` | Create product |
| `/dashboard/vendor/products/[id]/edit` | Edit product |
| `/dashboard/vendor/services` | Services list |
| `/dashboard/vendor/services/new`, `[id]/edit`, `[id]/availability` | Service CRUD + slots |
| `/dashboard/vendor/events` | Events list |
| `/dashboard/vendor/events/new`, `[id]/edit`, `[id]/tickets`, `[id]/attendees`, `[id]/checkin` | Event lifecycle |
| `/dashboard/vendor/bookings` | Booking management |
| `/dashboard/vendor/requests` | On-demand requests |
| `/dashboard/vendor/orders` | Split orders |
| `/dashboard/vendor/orders/[splitOrderId]` | Split detail + fulfillment actions |
| `/dashboard/vendor/finance` | Ledger, balance, payout request |
| `/dashboard/vendor/shipping` | SELF vs LINKWE + zone rates |
| `/dashboard/vendor/messages` | Store messages |
| `/dashboard/vendor/reviews` | Review management |
| `/dashboard/vendor/partners` | Cross-store content requests |
| `/dashboard/vendor/staff` | Staff availability |
| `/dashboard/vendor/store/edit` | Store profile edit |
| `/dashboard/vendor/listings/new`, `listings/[id]/edit` | Legacy listings |
| `/dashboard/vendor/ai-assistant` | Full-page Rex |
| `/dashboard/vendor/settings` | Account settings |

### Admin dashboard

| Route | Purpose |
|-------|---------|
| `/dashboard/admin?tab=overview` | Metrics overview |
| `/dashboard/admin?tab=orders` | All orders + complete splits |
| `/dashboard/admin?tab=linkwe-delivery` | LinkWe delivery queue + CSV/PDF manifest |
| `/dashboard/admin?tab=payouts` | Delivered splits awaiting earnings release |
| `/dashboard/admin?tab=tickets` | Ticket order admin |
| `/dashboard/admin?tab=vendors` | Vendor management |
| `/dashboard/admin?tab=customers` | Customer management |
| `/dashboard/admin?tab=settings` | Admin settings placeholder |
| `/dashboard/admin/products` | Product moderation |
| `/dashboard/admin/stores` | Store moderation |
| `/dashboard/admin/listings` | Listing moderation (**exists, not in main nav**) |
| `/dashboard/admin/verification` | Vendor ID/bank verification |
| `/dashboard/admin/users` | User admin |
| `/dashboard/admin/messages` | Admin messaging |

**Dormant admin UI files (not in `admin-shell` nav):** `warehouse-tab.tsx`, `map-tab.tsx`, `couriers-tab.tsx`

### Courier dashboard (**dormant**)

| Route | Purpose |
|-------|---------|
| `/dashboard/courier` | Courier home |
| `/dashboard/courier/onboarding` | Courier steps |
| `/dashboard/courier/bank`, `/settings` | Courier account |
| `/dashboard/courier/jobs/[shipmentId]` | Job detail |

### Events — check-in PWA

| Route | Purpose |
|-------|---------|
| `/scan/[eventId]` | Staff offline-capable QR scanner |
| `/checkin/[qrToken]` | Public check-in token route |

### API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/invoice/[orderId]` | GET | Customer invoice PDF |
| `/api/vendor-invoice/[splitOrderId]` | GET | Vendor invoice PDF |
| `/api/ticket-pdf/[ticketId]` | GET | Ticket PDF |
| `/api/linkwe-manifest` | GET | Admin LinkWe delivery manifest PDF (`?ids=`) |
| `/api/webhooks/stripe` | POST | Stripe webhooks (orders, bookings, tickets) |
| `/api/cron/auto-complete` | GET | Cron: auto-complete bookings/orders/ticket earnings |
| `/api/chat` | POST | Zara customer AI (streaming) |
| `/api/vendor-ai` | POST | Rex vendor AI (streaming) |
| `/api/search` | GET | Universal search API |
| `/api/products/search`, `/api/stores/search` | GET | Scoped search |
| `/api/booking-checkout` | POST | Booking payment |
| `/api/contact` | POST | Contact form |

---

## 6. Features in Detail

### Auth & onboarding

- **Signup kinds:** CUSTOMER, BUSINESS (→ VENDOR role), COURIER (`lib/auth/signup-kinds.ts`)
- **Password:** bcrypt, min 8 chars; rate-limited registration
- **Session:** JWT cookie, 7 days
- **Business onboarding:** 3 steps — business details, KYC evidence upload, store setup (`onboarding/business/step-*`)
- **Vendor layout guard:** incomplete onboarding → redirect to step N
- **ID verification:** vendors must submit a government-issued ID plus a selfie holding the same ID. Admin `/verification` shows both and labels complete submissions as requiring manual authenticity/face-match review. Server-side approval is blocked until ID, selfie, logo, description, bank details, and phone are present.

### Vendor

| Area | Built? | Notes |
|------|--------|-------|
| Store profile | ✅ | Logo, cover, hours, region, tags, `store/edit` |
| Products | ✅ | Simple, variants, digital, bookable; bulk upload; Rex can create |
| Services | ✅ | Via Product `isBookable` + `/services` pages; separate `Service` model less used |
| Listings | ⚠️ Parallel | Legacy Listing catalog + admin listings page |
| Events & ticketing | ✅ | Full vendor event CRUD, ticket types, promo codes, attendees, check-in |
| Finance/payouts | ✅ | Ledger view, `requestPayout`, bank details |
| Bookings | ✅ | Slots, availability overrides, Stripe booking checkout |
| On-demand | ✅ | `OnDemandRequest` flow in `/requests` |
| Reviews | ✅ | Vendor reply |
| Vendor AI (Rex) | ✅ | Floating + full-page; tools for products, events, store, sales |
| Shipping settings | ✅ | `SELF` vs `LINKWE`, per-zone rates for SELF |
| Staff/availability | ✅ | Staff members + per-service assignment |

### Customer

| Area | Built? | Notes |
|------|--------|-------|
| Shop/search | ✅ | `/shop`, `/search` (Product + Service + Store) |
| Product/service/store pages | ✅ | |
| Cart | ✅ | `ProductCartItem` + event ticket cart |
| Checkout | ✅ | Stripe Elements, per-store shipping, address capture |
| Orders/tracking | ✅ | Per-split status, mark received, notifications |
| Wishlist/saved stores | ✅ | |
| Bookings | ✅ | `/bookings` |
| AI shopping (Zara) | ✅ | Floating chat + `/chat`; add to cart, events |
| Messages | ✅ | Per-store conversations |
| Tickets | ✅ | `/my-tickets`, QR, PDF, transfer |

### Admin

| Area | Built? | Notes |
|------|--------|-------|
| Orders | ✅ | Main + split view, cancel, complete splits |
| LinkWe Delivery | ✅ | Queue READY_FOR_LINKWE + OUT_FOR_DELIVERY; bulk mark out; CSV + PDF manifest |
| Payouts | ✅ | DELIVERED + `earningsReleased: false`; admin complete → ledger |
| Verification | ✅ | ID docs, bank reveal (screen-only mask) |
| Users | ✅ | Suspend, delete, role |
| Products/stores moderation | ✅ | Archive, publish, status |
| Listings moderation | ✅ | Page exists at `/admin/listings`, not in sidebar |
| Tickets | ✅ | Ticket orders tab |
| Messages | ✅ | |
| Warehouse/map/couriers | ⚠️ Dormant | Component files exist, removed from nav |

### Events & ticketing lifecycle

1. **Create:** Vendor `/events/new` or Rex `create_event`
2. **Ticket types:** `EventTicketType` with quantity caps
3. **Publish:** `publishEvent` action
4. **Purchase:** `TicketPurchaseCard` on `/events/[slug]` → `createTicketPaymentIntent` → Stripe webhook `handleTicketOrderPaid`
5. **Tickets issued:** `Ticket` rows with `qrToken`, `ticketNumber`
6. **Customer:** `/my-tickets` — QR display, link to PDF `/api/ticket-pdf/[ticketId]`
7. **Check-in:** `/scan/[eventId]` offline PWA (`lib/offline-checkin/*`), `/dashboard/vendor/events/[id]/checkin`
8. **Promo codes:** `EventPromoCode` + vendor UI `PromoCodesPanel`; applied in `ticket-checkout.ts`
9. **Transfer:** `transferTicket` in `my-tickets.ts` + `TransferTicketPanel`
10. **Earnings:** `releaseTicketOrderEarnings` after `payoutEligibleAt` (cron); 6% flat commission
11. **Waitlist:** `EventWaitlist` model — basic schema; auto-promotion not confirmed in UI

**Separate rail:** No `MainOrder`/`SplitOrder` for tickets.

---

## 7. Shipping & Fulfillment Model (Current)

### Store shipping mode

`Store.shippingMode` (`prisma/schema.prisma`):
- **SELF:** Vendor delivers; sets `VendorShippingRate` per zone (`METRO`, `EXTENDED`, `REMOTE`, `TOBAGO_METRO`)
- **LINKWE:** Platform delivers; fee from `getCheckoutShipping(region, weightLbs)` in `lib/checkout/pricing.ts` / `lib/shipping/per-store-shipping.ts`

Configured at `/dashboard/vendor/shipping` via `getVendorShippingSettings` / `ShippingSettingsClient`.

### Checkout shipping computation

`lib/checkout/compute-cart-shipping.ts` → `computePerStoreShipping`:
- Digital-only or pickup-only items → $0 shipping
- SELF: lookup active rate for checkout zone; **coverage failure** if no rate (`hasCoverageFailure`, `blockedStores`) — checkout blocked
- LINKWE: weight-based platform rate, always delivers

On payment: `createSplitOrdersFromMainOrder` allocates `shippingMinor` per store split.

### Vendor fulfillment flow (active)

```
AWAITING_VENDOR_ACTION
  → startPreparing → PREPARING
  → [SELF] markShipped → SHIPPED
  → [LINKWE] markReadyForLinkWe → READY_FOR_LINKWE
```

Admin (`admin-linkwe-delivery.ts`):
- `markOutForLinkWeDelivery`: READY_FOR_LINKWE → OUT_FOR_DELIVERY (+ buyer notification)

Customer receipt (`order-received.ts`):
- `markSplitReceived`: SHIPPED or OUT_FOR_DELIVERY → DELIVERED (+ `autoCompleteAt` = delivered + 7 days)
- `markOrderReceived`: marks all eligible splits DELIVERED

Earnings release (`complete-order.ts`):
- Admin `completeSplitOrder` on DELIVERED → COMPLETED + ledger
- Cron `ORDER_AUTO_COMPLETE` after `autoCompleteAt`
- **NOT** triggered by `markSplitReceived` alone (safety: admin/cron valves)

### Admin operations queues

| Queue | Filter | Actions |
|-------|--------|---------|
| **LinkWe Delivery** | `READY_FOR_LINKWE`, `OUT_FOR_DELIVERY` | Mark out, export CSV/PDF manifest |
| **Payouts** | `DELIVERED`, `earningsReleased: false` | Complete → release earnings |

Manifest exports include: split ref, store, customer, email, phone, address, map coords, region, items/weight, LinkWe fee. Shared helpers in `lib/orders/manifest-shared.ts`.

### Retired warehouse/courier path

Still in code/schema: `chooseCourierPickup`, `chooseVendorDropoff`, `Warehouse`, `Shipment`, `DockBay`, courier dashboard. **Not** in current admin navigation or vendor happy path.

---

## 8. The Money Model

### Payment

- Stripe **PaymentIntent**, `currency: "ttd"`, `amount` in **minor units** (cents)
- Product checkout: `app/actions/checkout.ts` → metadata `orderId`
- Webhook: `app/api/webhooks/stripe/route.ts` → marks PAID, creates splits, emails, notifications
- Bookings: `lib/finance/booking-payment.ts` + `/api/booking-checkout`
- Tickets: `app/actions/ticket-checkout.ts` → `metadata.ticketOrderId`

### Vendor ledger (`VendorLedgerEntry`)

Each earnings release creates paired rows:
1. **CREDIT_ORDER_SETTLEMENT** (`ledgerEntryType`: ORDER_REVENUE, BOOKING_COMPLETE, TICKET_SALE, SHIPPING, etc.) — net to vendor
2. **DEBIT_PLATFORM_FEE** (`ledgerEntryType`: PLATFORM_COMMISSION) — commission

Idempotency via `idempotencyKey` (e.g. `split:{id}:ORDER_REVENUE`).

### Commission by plan (`lib/finance/commission.ts`)

| Plan | Product rate | Service rate |
|------|--------------|--------------|
| STARTER | 15% | 8% |
| GROWTH | 12% | 5% |
| PRO | 8% | 3% |

Tickets: flat **6%** (`TICKET_COMMISSION_RATE`), not plan-tiered.

Plan from `Store.subscriptionPlan` via `resolveVendorPlan()` — **used for commission only**; no feature gating found in codebase.

### Earnings release valves

| Trigger | Function | Ledger type |
|---------|----------|-------------|
| Admin completes split (Payouts tab) | `completeSplitOrder` → `releaseSplitOrderEarnings` | ORDER_REVENUE |
| Cron 7 days after DELIVERED | `auto-complete` cron | ORDER_AUTO_COMPLETE |
| Customer mark received | Sets DELIVERED + `autoCompleteAt` only — **does not release** | — |
| Booking complete / cron | `releaseBookingEarnings` | BOOKING_COMPLETE / BOOKING_AUTO_COMPLETE |
| Ticket after event hold | `releaseTicketOrderEarnings` | TICKET_SALE |

### SELF / LINKWE shipping fork (`releaseSplitOrderEarnings`)

After product earnings ledger:
- **SELF** + `shippingMinor > 0`: extra `CREDIT_ORDER_SETTLEMENT` with `ledgerEntryType: SHIPPING`, **zero commission**, idempotency `split:{id}:{type}:shipping`
- **LINKWE:** no vendor shipping credit — fee kept by platform

### Available balance (`lib/finance/release-earnings.ts` → `getVendorAvailableBalanceMinor`)

```
credits = sum(CREDIT_ORDER_SETTLEMENT)
debits  = sum(DEBIT_PLATFORM_FEE + DEBIT_PAYOUT + DEBIT_REFUND)
balance = credits - debits
```

Vendor requests payout via `requestPayout` → `PayoutRequest` → admin approve → `DEBIT_PAYOUT` ledger row.

---

## 9. Checkout & Address

### Flow (`app/checkout/checkout-client.tsx` + `app/actions/checkout.ts`)

1. Load cart (`ProductCartItem`)
2. Customer selects delivery region, optional map-picked address (`deliveryAddress`, `deliveryLat`, `deliveryLng`, `deliveryPhone`)
3. `getCheckoutShippingBreakdown` — per-store fees; blocks if SELF store can't deliver to zone
4. `createPaymentIntent` — creates `Address` when `useDelivery && trimmedAddress`, sets `MainOrder.shippingAddressId`
5. Stripe confirm → webhook PAID → `createSplitOrdersFromMainOrder`

**Address model fields used:** `line1`, `city`, `region`, `country: "TT"`, `phone`, `latitude`, `longitude`, `userId`

### Surfaced downstream

| Surface | Address fields |
|---------|----------------|
| Customer order page | Buyer name/email (address on card UI varies) |
| Admin LinkWe delivery cards | `line1`, phone (click-to-call), Google Maps directions |
| CSV manifest | Phone, Address, Map (lat,lng), Region fallback |
| PDF manifest | Same via `ManifestDocument` |
| Payouts CSV | Region only (no delivery address — by design) |

Null-safe: older orders may lack `shippingAddress`; UI falls back to `mainOrder.region`.

---

## 10. AI Features

### Zara — customer shopping chat

| Item | Value |
|------|-------|
| **Route** | `app/api/chat/route.ts` |
| **Model** | `claude-sonnet-4-5` (Anthropic) |
| **System prompt** | `lib/chat/systemPrompt.ts` → `LINKWE_SYSTEM_PROMPT` |
| **UI** | `components/layout/PublicFloatingChatButton`, `app/chat/page.tsx`, `ShoppingChat.tsx` |
| **Streaming** | Text deltas via `messageStream.on("text")` |
| **Tools** | `add_to_cart`, `add_multiple_to_cart`, `add_event_tickets_to_cart`, `search_events` (via `SEARCH_EVENTS_TOOL`) |
| **Product search** | `searchProducts` with query fallbacks; outfit multi-search |
| **Display** | Products in ` ```products ` JSON blocks → rendered as cards; typewriter buffer on client |

### Rex — vendor assistant

| Item | Value |
|------|-------|
| **Route** | `app/api/vendor-ai/route.ts` |
| **Model** | `claude-sonnet-4-5` |
| **System prompt** | `lib/chat/vendorSystemPrompt.ts` → `VENDOR_SYSTEM_PROMPT` |
| **UI** | `floating-ai-chat.tsx`, `app/(dashboard)/dashboard/vendor/ai-assistant/page.tsx` |
| **Auth** | VENDOR session required |
| **Tools (partial list)** | `create_product`, `search_vendor_products`, `get_product_details`, `update_product`, image tools (`attach_product_images`, `set_product_cover_image`, …), `create_service`, `get_store_summary`, `get_sales_insights`, `get_inventory_alerts`, `get_recent_orders`, `update_store`, `publish_product`, `get_bookings_summary`, `get_vendor_events`, `create_event`, `update_event`, `create_ticket_type`, `upload_event_cover_image`, `publish_event`, … |
| **Image safety** | `isTrustedHostedImageUrl` — Cloudinary only for saved URLs |

---

## 11. Subscription / Commission Tiers

### Plans

`VendorSubscriptionPlan`: **STARTER** (default), **GROWTH**, **PRO** on `Store.subscriptionPlan`.

### What is enforced today

| Enforced | Not enforced (in code reviewed) |
|----------|----------------------------------|
| Commission rates on product order earnings | Subscription billing / Stripe subscription |
| Commission rates on booking earnings | Feature limits (product count, AI usage, etc.) |
| Prisma `@default(STARTER)` on `Store.subscriptionPlan`; `resolveVendorPlan()` returns the plan when it is `STARTER`, `GROWTH`, or `PRO`, otherwise coerces to `STARTER` | Tier-based UI locks |

**Conclusion:** Tiers are **commission-rate metadata only** unless manually set on Store. No automated upgrade flow or paywall found.

---

## 12. Known Gaps, Dormant Code, and TODOs

### Dual catalog

- **Product** = primary (shop, cart, checkout, search)
- **Listing** = parallel legacy (split order `listingId`, vendor listings tab, admin listings page)
- `createSplitOrdersFromMainOrder` may auto-create Listing from Product slug

### Dormant / orphaned UI

- Admin: `warehouse-tab.tsx`, `map-tab.tsx`, `couriers-tab.tsx` — **not in `admin-shell` nav**
- Admin listings page — **not in sidebar** (reachable by URL)
- Courier dashboard + register — code remains, ops retired
- `fulfillment.ts`: `chooseCourierPickup`, `chooseVendorDropoff` — warehouse era
- Vertical models: RealEstate, Vehicle, Place, FoodOutlet, Accommodation — schema only

### Placeholder / incomplete copy

- `/dashboard` landing cards still say "will live here" for some roles
- Admin user detail: "Detailed courier stats coming soon"
- Admin `settings` tab is lightweight

### Legal

- `/privacy` and `/terms` — **substantive legal pages** (May 2026): multiple numbered sections (privacy covers collection, use, sharing, rights, security, cookies; terms covers acceptance, accounts, vendor/customer obligations, payments, liability). Not placeholder lorem ipsum.

### Production / launch risks (from project context)

- Neon database credentials were rotated and Vercel URLs updated on 2026-08-14 (metadata reverified 2026-08-20)
- Production migration ledger audited 2026-08-20: 75 distinct names match the repository and none are unfinished; only non-blocking drift is on the unused legacy `Service` table
- Stripe test→live transition noted as deferred
- Stripe webhook error-response leakage was resolved in `0da5970`; public responses are generic and detailed exceptions remain server-side.
- Ticket `quantitySold` fulfilment was made atomic with the paid-order claim on 2026-08-20; failures roll back for safe Stripe retry

### Partial features

- Event waitlist: model exists; full auto-promotion UX unclear
- `Service` model vs Product-as-service: both exist
- `OrderDocument` storage vs on-the-fly PDF generation
- Customer order page: delivery shows name/email; address surfaced more on admin manifest than buyer order page

### Build config

- `typescript.ignoreBuildErrors: true` — type errors won't fail CI build

---

## 13. Brand & Design Tokens

### Canonical colors (`lib/design-system.ts` + `app/globals.css`)

| Token | Hex | Usage |
|-------|-----|-------|
| **Scarlet** | `#D4450A` | Primary brand, CTAs, accents |
| Scarlet hover | `#B83A09` | Button hover |
| **Dark** | `#1C1C1A` | Text primary, dark surfaces |
| Background / surface | `#F5F5F5` | Page background |
| Amber | `#E8820C` | Secondary accent |
| Blue | `#1A7FB5` | Info badges |
| Success | `#10B981` | Positive states |
| Danger | `#EF4444` | Errors |

### CSS variables (`:root` in `globals.css`)

```css
--scarlet: #d4450a;
--scarlet-hover: #b83a09;
--dark: #1c1c1a;
--surface: #f5f5f5;
--text-primary: #1c1c1a;
--text-muted: #7c7b77;
--card-border: rgba(28, 28, 26, 0.08);
--font-display: var(--font-sora), sans-serif;
```

### Typography

- **Sora** via `next/font/google` in `app/layout.tsx` → `--font-sora`
- Applied on `body` + Tailwind `font-sans`
- Helpers: `lib/design-system.ts` → `typography.h1`, `tw.textScarlet`, etc.

### PDF documents

- Built-in **Helvetica** only — no `Font.register` (invoice, manifest pattern)

---

## 14. Key File Map

### Auth & session
| File | Role |
|------|------|
| `app/(auth)/auth-actions.ts` | Login, register, logout |
| `lib/auth/session.ts` | `getSession`, `createSession` |
| `lib/auth/token.ts` | JWT sign/verify |
| `lib/auth/redirects.ts` | `getRoleDashboardPath` |
| `lib/auth/landing.ts` | Post-login routing |
| `proxy.ts` | Protected route gate |

### Checkout & cart
| File | Role |
|------|------|
| `app/actions/checkout.ts` | PaymentIntent, address, order create |
| `app/actions/cart.ts` | Cart mutations |
| `lib/checkout/compute-cart-shipping.ts` | Shipping breakdown |
| `lib/shipping/per-store-shipping.ts` | SELF/LINKWE per-store logic |
| `lib/shipping/trinidad-zoning.ts` | Region → zone mapping |
| `app/checkout/checkout-client.tsx` | Checkout UI |

### Finance
| File | Role |
|------|------|
| `lib/finance/commission.ts` | Rates, `calculateEarningsMinor` |
| `lib/finance/release-earnings.ts` | Ledger pair creation, balance |
| `lib/finance/complete-order.ts` | `releaseSplitOrderEarnings`, SELF shipping credit |
| `lib/finance/complete-booking.ts` | Booking earnings |
| `lib/finance/release-ticket-earnings.ts` | Ticket earnings |
| `lib/finance/vendor-balance.ts` | Debit type helpers |
| `app/actions/vendor.ts` | `requestPayout` |
| `app/actions/admin-payouts.ts` | Payout queue |
| `app/actions/admin-orders.ts` | `completeSplitOrder` |

### Fulfillment & shipping
| File | Role |
|------|------|
| `app/actions/fulfillment.ts` | Vendor status transitions |
| `app/actions/admin-linkwe-delivery.ts` | LinkWe queue + CSV manifest |
| `app/api/linkwe-manifest/route.ts` | PDF manifest |
| `lib/fulfillment/split-orders.ts` | Create splits from MainOrder |
| `lib/fulfillment/order-status.ts` | `recalculateMainOrderStatus` |
| `app/actions/order-received.ts` | Customer mark received |
| `lib/orders/manifest-shared.ts` | Shared manifest helpers |
| `lib/orders/split-weight.ts` | Weight computation |

### Vendor
| File | Role |
|------|------|
| `app/actions/product.ts` | Product CRUD |
| `app/actions/events.ts` | Event CRUD |
| `app/actions/vendor-shipping.ts` | Shipping settings |
| `components/vendor/vendor-dashboard-shell.tsx` | Vendor chrome |
| `app/(dashboard)/dashboard/vendor/layout.tsx` | Onboarding guard |

### Admin
| File | Role |
|------|------|
| `app/(dashboard)/dashboard/admin/components/admin-shell.tsx` | Admin nav |
| `app/(dashboard)/dashboard/admin/components/admin-dashboard.tsx` | Tab router |
| `app/(dashboard)/dashboard/admin/components/linkwe-delivery-tab.tsx` | Delivery UI |
| `app/(dashboard)/dashboard/admin/components/payouts-tab.tsx` | Payouts UI |
| `app/actions/admin-orders.ts` | Order admin |
| `app/actions/vendor-verification.ts` | Verification |

### Events & tickets
| File | Role |
|------|------|
| `app/actions/ticket-checkout.ts` | Ticket payment |
| `app/actions/my-tickets.ts` | Transfer, list |
| `app/actions/ticket-checkin.ts` | Check-in sync |
| `app/actions/promo-codes.ts` | Promo CRUD |
| `lib/offline-checkin/*` | Offline scanner queue |
| `app/api/ticket-pdf/[ticketId]/route.ts` | Ticket PDF |
| `components/events/TicketPurchaseCard.tsx` | Purchase UI |

### AI
| File | Role |
|------|------|
| `app/api/chat/route.ts` | Zara API |
| `app/api/vendor-ai/route.ts` | Rex API |
| `lib/chat/systemPrompt.ts` | Zara prompt + tools |
| `lib/chat/vendorSystemPrompt.ts` | Rex prompt |

### PDFs
| File | Role |
|------|------|
| `app/api/invoice/[orderId]/route.ts` | Customer invoice |
| `app/api/vendor-invoice/[splitOrderId]/route.ts` | Vendor invoice |
| `components/orders/InvoiceDocument.tsx` | Invoice layout |
| `components/orders/ManifestDocument.tsx` | Delivery manifest layout |

### Search & storefront
| File | Role |
|------|------|
| `lib/search/run-search.ts` | Universal search |
| `app/actions/public-stores.ts` | Store discovery |
| `app/shop/page.tsx` | Shop browse |

### Infrastructure
| File | Role |
|------|------|
| `prisma/schema.prisma` | Full data model |
| `next.config.ts` | Build config |
| `app/api/webhooks/stripe/route.ts` | Payment webhooks |
| `app/api/cron/auto-complete/route.ts` | Auto-complete cron |
| `lib/email/templates.ts` | Email templates |
| `lib/prisma.ts` | Prisma client |

---

*End of snapshot. Re-read `prisma/schema.prisma` and `package.json` after major merges.*

---

## 15. Notifications & Email

### A) In-app notifications

**Implementation:** `app/actions/notifications.ts` → `createNotification()`. Wraps `prisma.notification.create` in **try/catch with empty catch** — failures are swallowed so parent mutations never crash.

**UI:** `components/ui/NotificationBell.tsx` maps `NotificationType` to icons and links.

| NotificationType | Recipient | Trigger (function / file) | Title / linkUrl (typical) |
|------------------|-----------|---------------------------|---------------------------|
| **ORDER_PLACED** | Customer | `confirmOrderPaid` — `app/actions/checkout.ts` | "Order placed successfully" → `/orders/{orderId}` |
| **ORDER_PLACED** | Vendor (per store owner, deduped) | Same — one notification per `store.ownerId` | "New order #{ref}" → `/dashboard/vendor/orders` |
| **ORDER_STATUS_UPDATED** | Customer | `markShipped` — `app/actions/fulfillment.ts` (SELF) | "Your order is on its way" → `/orders/{mainOrderId}` |
| **ORDER_STATUS_UPDATED** | Customer | `markOutForLinkWeDelivery` — `app/actions/admin-linkwe-delivery.ts` | "Your order is out for delivery" → `/orders/{mainOrderId}` |
| **BOOKING_CONFIRMED** | Customer | `handleBookingPaymentIntentSucceeded` — `lib/finance/booking-payment.ts` (deposit or full payment) | "Deposit paid" / "Payment received" → `/bookings` |
| **BOOKING_CONFIRMED** | Vendor | Same (if `store.ownerId` present) | "Booking deposit received" / "New paid booking" → `/dashboard/vendor/bookings` |
| **BOOKING_CONFIRMED** | Customer + vendor | `sendBookingConfirmationEmails` — `app/actions/booking-emails.ts` (also fires notifications after emails) | Same pattern → `/bookings` / vendor bookings |
| **BOOKING_CANCELLED** | — | **NOT IMPLEMENTED** — enum exists in schema and `NotificationBell` maps it, but **no `createNotification` call** found in codebase | — |
| **ON_DEMAND_REQUEST_RECEIVED** | Vendor | `createOnDemandRequest` — `app/actions/on-demand.ts` | "New on-demand request" → `/dashboard/vendor/requests` |
| **ON_DEMAND_REQUEST_ACCEPTED** | Customer | `acceptOnDemandRequest` — `app/actions/on-demand.ts` | "Your request was accepted" → `/my-requests` |
| **ON_DEMAND_REQUEST_DECLINED** | Customer | `declineOnDemandRequest` — `app/actions/on-demand.ts` | "Request declined" → `/my-requests` |
| **ON_DEMAND_REQUEST_COMPLETED** | — | **NOT IMPLEMENTED** — `completeOnDemandRequest` updates status only; no notification | — |
| **REVIEW_RECEIVED** | Vendor | `submitReview` — `app/actions/reviews.ts` (product review) | "New {n}-star review" → vendor reviews tab |
| **REVIEW_RECEIVED** | Vendor | `submitStoreReview` — `app/actions/reviews.ts` | "New {n}-star store review" → vendor reviews tab |
| **PAYOUT_PROCESSED** | Vendor | `releaseSplitOrderEarnings` — `lib/finance/complete-order.ts` | "Order completed — earnings released" / "Order auto-completed" → `/dashboard/vendor/finance` |
| **PAYOUT_PROCESSED** | Vendor | `releaseBookingEarnings` — `lib/finance/complete-booking.ts` | "Service marked complete" / "Booking auto-completed" → `/dashboard/vendor/finance` |
| **PAYOUT_PROCESSED** | Vendor | `releaseTicketOrderEarnings` — `lib/finance/release-ticket-earnings.ts` | "Event ticket earnings released" → `/dashboard/vendor/finance` |
| **TICKET_PURCHASED** | Customer | `handleTicketOrderPaid` — `app/api/webhooks/stripe/route.ts` (paid tickets) | "Tickets confirmed — {event}" → `/my-tickets` |
| **TICKET_PURCHASED** | Customer | Free-ticket path — `app/actions/ticket-checkout.ts` (`void createNotification`) | "You're registered for {event}" → `/my-tickets` |
| **MESSAGE_RECEIVED** | Vendor or customer | `sendMessage` — `app/actions/messages.ts` | "New message" → conversation URL (role-specific) |
| **MESSAGE_RECEIVED** | Customer + vendor | Admin support message branch in `sendMessage` | "LinkWe Support sent you a message" (both parties) |
| **MESSAGE_RECEIVED** | Customer + vendor | Admin broadcast in `messages.ts` (second code path) | Same support copy |
| **GENERAL** | Target store owner | `requestCrossStoreFeature` — `app/actions/cross-store.ts` | "Feature request" → partners URL |
| **GENERAL** | Requesting store owner | `respondToCrossStoreRequest` — `app/actions/cross-store.ts` | "Feature request approved/declined" → partners URL |

### B) Transactional email (Resend)

**Send path:** `lib/email/send.ts` → `resend.emails.send({ from: \`LinkWe <${FROM_EMAIL}>\`, ... })`. Failures logged, **never throw**.

**From address:** `lib/email/resend.ts` — `FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"`. Requires `RESEND_API_KEY`.

| Template / email | Recipient | Trigger | Key contents |
|------------------|-----------|---------|--------------|
| `orderConfirmedCustomerEmail` | Customer | `confirmOrderPaid` — `checkout.ts` | Order ref, item count, total TTD, track order link |
| `newOrderVendorEmail` | Vendor(s) | Same (one email per unique vendor email on order) | Order ref, items, total, dashboard orders link |
| `bookingConfirmedCustomerEmail` | Customer | `sendBookingConfirmationEmails` — `booking-emails.ts` | Service, provider, date, time, view booking |
| `newBookingVendorEmail` | Vendor | Same | Service, customer, date, time, vendor bookings link |
| `ticketConfirmationEmail` | Customer | Stripe webhook `handleTicketOrderPaid` | Event, order ref, ticket count, total, my-tickets link |
| `ticketConfirmationEmail` | Customer | Free ticket checkout — `ticket-checkout.ts` | Same (total may be "Free") |
| Ticket transfer email | New holder | `transferTicket` — `my-tickets.ts` | **Reuses** `ticketConfirmationEmail` with string replacements ("transferred to you", check-in URL); **no dedicated template** in `templates.ts` |
| `newOnDemandRequestVendorEmail` | Vendor | On-demand request created — `on-demand.ts` | Service, customer, description, dashboard requests |
| `onDemandAcceptedCustomerEmail` | Customer | Request accepted — `on-demand.ts` | Quote, ETA, confirm link |
| `onDemandDeclinedCustomerEmail` | Customer | Request declined — `on-demand.ts` | Reason, browse services link |
| `newReviewVendorEmail` | Vendor | Product review submitted — `reviews.ts` | Rating, reviewer, product, review body |
| Password reset | User | `requestPasswordReset` — `password-reset.ts` | **Inline HTML** (not in `templates.ts`): reset link, 1-hour expiry |
| Contact form (admin) | `admin@linkwemall.com` | `POST /api/contact` | Name, email, topic, message |
| Contact confirmation | Submitter | Same | Acknowledgment + message echo |

**NOT implemented (no send found):**
- **Payout / earnings released email** — vendors get in-app `PAYOUT_PROCESSED` notification only
- **Booking cancellation email**
- **Order status update email** (shipped / out for delivery) — notifications only
- **Dedicated ticket-transfer template** — uses modified confirmation email

---

## 16. PWA & Offline Ticket Check-in

### A) Customer PWA

**Manifest:** `public/manifest.json`

| Field | Value |
|-------|-------|
| name / short_name | LinkWe |
| description | T&T multi-vendor marketplace |
| start_url | `/` |
| display | `standalone` |
| background_color | `#F7F5F2` |
| theme_color | `#1C1C1A` |
| orientation | `portrait-primary` |
| scope | `/` |
| icons | 72–512px PNGs (`/icon-*.png`), `purpose: maskable any` |
| shortcuts | Shop → `/shop`, Services → `/services`, My Orders → `/orders` |

**Service worker:** `public/sw.js`, registered by `components/pwa/ServiceWorkerRegistration.tsx` on window load.

**Cache name:** `linkwe-v3`

**Caching strategy:**
- **Install:** precache `/`, `/offline`, `/manifest.json`, icons
- **General GET:** network-first, fallback cache, fallback `/offline`
- **Skips:** non-GET, `/api/`, most `/_next/` (except static), `/dashboard/`, `/chat`
- **`/scan/` navigations:** network-first; successful responses cached for offline staff check-in
- **`/_next/static/`:** cache-first (for offline scan page assets)
- **Push handlers:** stubbed for future notifications (`push`, `notificationclick`)

**Install prompt:** `lib/hooks/use-pwa-install.ts` + `components/pwa/InstallPrompt.tsx`
- Inline script in `app/layout.tsx` captures `beforeinstallprompt` → `window.__pwaInstallPrompt`
- Hook calls `event.preventDefault()`, stores deferred prompt, exposes `install()` → `prompt()` + `userChoice`
- Banner after 3s if installable (Chromium) or iOS (manual "Add to Home Screen" instructions)
- Dismiss persisted in `localStorage` key `pwa-install-dismissed`

**Offline fallback:** `app/offline/page.tsx` — dark branded page with reload + homepage link; served when SW fetch fails.

**Also:** `app/get-app/page.tsx` — PWA install marketing page.

### B) Offline check-in PWA (staff scan flow)

**Entry routes:**
- `/scan/[eventId]` — `StaffScanPage` (public staff gate + scanner)
- `/checkin/[qrToken]` — customer ticket QR landing + online admit panel
- Vendor dashboard: `/dashboard/vendor/events/[id]/checkin` — same `CheckInScanner` (logged-in vendor, no scan code)

**Architecture:**

1. **Gate validation** (`StaffScanPage`): online → `verifyEventScanCode(eventId, code)`; offline → `getCachedEvent(eventId)` + scan code match from prior online session
2. **Allowlist download:** `getEventAllowlist` (server) → `saveAllowlist` → IndexedDB `allowlist` store (paid, non-refunded/cancelled tickets)
3. **Event metadata cache:** `saveCachedEvent` / `getCachedEvent` in `events` store
4. **Persistent storage:** `requestPersistentStorage()` (`lib/offline-checkin/persist.ts`)
5. **Offline scan:** `lookupTicket(qrToken)` from allowlist; block if `usedLocally` or status not `VALID`; pre-downloaded `USED` tickets show as already checked in
6. **Admit offline:** `markUsedLocally` + `enqueueScan` → `syncQueue` store
7. **Sync:** `syncQueuedScans` on `online` event + manual "Sync now" → server action `syncOfflineCheckIns`
8. **Server reconciliation** (`syncOfflineCheckIns`): scans sorted by `scannedAt` ascending; **first-wins ADMITTED**, later scans → DUPLICATE; writes `TicketCheckIn` audit rows (`source: OFFLINE`); updates `Ticket.status` to `USED` on first admit
9. **Duplicate report:** `getEventCheckInReport` — vendor attendees page; lists DUPLICATE rows with device id/label vs earliest ADMITTED

**IndexedDB** (`lib/offline-checkin/db.ts`):
- DB name: `linkwe-checkin`, version **2**
- Stores: `allowlist` (key: `qrToken`, index `by_event`), `syncQueue`, `events`, `scanLog` (**store created but no writes found in codebase**)

**Device identity** (`lib/offline-checkin/device-id.ts`):
- `getOrCreateDeviceId()` → `localStorage` key `linkwe_scan_device_id`, format `dev_{uuid}`
- `getDeviceLabel` / `setDeviceLabel` → `linkwe_scan_device_label` (user-entered, e.g. placeholder "Front Gate" — **no hardcoded Gate A/B enum**)

**Key files:**

| File | Role |
|------|------|
| `lib/offline-checkin/db.ts` | idb schema |
| `lib/offline-checkin/allowlist.ts` | Ticket cache read/write, `markUsedLocally` |
| `lib/offline-checkin/queue.ts` | Offline scan queue |
| `lib/offline-checkin/sync.ts` | Flush queue to server |
| `lib/offline-checkin/event-cache.ts` | Event + scan code for offline gate |
| `lib/offline-checkin/device-id.ts` | Device id + label |
| `lib/offline-checkin/persist.ts` | `navigator.storage.persist()` |
| `app/actions/ticket-checkin.ts` | Allowlist API, online check-in, offline sync, duplicate report |
| `app/scan/[eventId]/StaffScanPage.tsx` | Staff gate UI |
| `app/(dashboard)/dashboard/vendor/events/[id]/checkin/CheckInScanner.tsx` | QR scanner + offline/online admit |
| `public/sw.js` | Caches `/scan/` pages for offline |

**Note:** Background sync uses **`online` event listener**, not the Service Worker Background Sync API.

---

## 17. Cron & Scheduled Jobs

**Config:** `vercel.json` — single cron entry.

| Route | Schedule (Vercel cron) | Auth |
|-------|------------------------|------|
| `GET /api/cron/auto-complete` | `0 2 * * *` (daily 02:00 UTC) | Vercel `Authorization: Bearer CRON_SECRET` or controlled manual `x-cron-secret` must match; else 401 |

**Implementation:** `app/api/cron/auto-complete/route.ts` (`export const runtime = "nodejs"`)

**Sweeps (each calls earnings release helpers):**

1. **Bookings:** `productBooking` where `autoCompleteAt <= now`, `earningsReleased: false`, status `CONFIRMED` or `DEPOSIT_PAID` → `releaseBookingEarnings(id, "SYSTEM", "BOOKING_AUTO_COMPLETE")`

2. **Split orders:** `splitOrder` where `autoCompleteAt <= now`, `earningsReleased: false`, status `DELIVERED` → `releaseSplitOrderEarnings(id, "SYSTEM", "ORDER_AUTO_COMPLETE")`

3. **Ticket orders:** `ticketOrder` where `payoutEligibleAt <= now`, `earningsReleased: false`, status `PAID` → `releaseTicketOrderEarnings`

**7-day auto-complete window:** `lib/finance/complete-order.ts` — `AUTO_COMPLETE_DAYS = 7`; `getOrderAutoCompleteAt(deliveredAt)` = delivered + 7 days. Set when customer marks split received (`order-received.ts`) or on delivery timestamp.

**Response JSON:** `{ bookingsCompleted, ordersCompleted, ticketOrdersReleased }` counts.

**No other cron routes** under `app/api/cron/` besides `auto-complete`.

---

## 18. Environment Variables

**Reference file:** `.env.example` (copy to `.env` for local dev). Next.js also loads `.env.local` (typical for production secrets on Vercel developer machines).

| Variable | Purpose | In `.env.example`? |
|----------|---------|-------------------|
| `DATABASE_URL` | PostgreSQL connection (local dev: `localhost:5432/linkwe_dev`; production: Neon) | ✅ |
| `NEXT_PUBLIC_BASE_URL` | App base URL for links/emails (`lib/app-base-url.ts`) | ✅ |
| `NEXT_PUBLIC_APP_URL` | Fallback base URL if `NEXT_PUBLIC_BASE_URL` unset | ❌ **missing** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Elements client | ✅ |
| `STRIPE_SECRET_KEY` | Stripe server API (`lib/stripe/stripe.ts`) | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification | ✅ |
| `CRON_SECRET` | Cron route auth (`x-cron-secret`) | ✅ (empty placeholder) |
| `CLOUDINARY_CLOUD_NAME` | Image uploads | ✅ |
| `CLOUDINARY_API_KEY` | Cloudinary | ✅ |
| `CLOUDINARY_API_SECRET` | Cloudinary | ✅ |
| `AUTH_SECRET` | JWT session signing (`lib/auth/token.ts`, min 32 chars) | ❌ **missing** |
| `RESEND_API_KEY` | Resend transactional email | ❌ **missing** |
| `RESEND_FROM_EMAIL` | From address (defaults to `onboarding@resend.dev`) | ❌ **missing** |
| `ANTHROPIC_API_KEY` | Zara + Rex chat APIs | ❌ **missing** |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Checkout/store maps (`StoreLocationPicker`, `StorefrontMapAndProducts`) | ❌ **missing** |
| `NEXT_PUBLIC_GOOGLE_PLACES_KEY` | Address autocomplete fallback in `StoreLocationPicker` | ❌ **missing** |
| `NODE_ENV` | Runtime (`development` / `production`) — set by Next/Vercel | N/A (implicit) |

**Typical split:**
- **Local `.env`:** `DATABASE_URL` → local Postgres; Stripe test keys; optional Cloudinary/Anthropic/Resend for full feature testing
- **Vercel production:** Neon `DATABASE_URL`, live/test Stripe keys, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, `AUTH_SECRET`, `RESEND_*`, `ANTHROPIC_API_KEY`, public map keys

---

## 19. Migration Discipline & Database Operations (CRITICAL FOR ANY AI)

**Read before any schema or DB change.** Local and production are separate databases.

### Hard rules

1. **Local `.env` → local Postgres.** Production is **Neon**. Never run `prisma migrate dev`, `prisma db push`, or `prisma migrate reset` against production `DATABASE_URL`.

2. **Production migration process (manual Neon path used in this project):**
   - Edit `prisma/schema.prisma`
   - Add `prisma/migrations/{timestamp}_{name}/migration.sql`
   - Locally: `prisma migrate deploy` + `prisma generate`
   - Apply SQL **by hand** in Neon SQL editor
   - Insert one row into `_prisma_migrations` with a real `shasum -a 256` checksum of the migration file (run INSERT exactly once)

3. **Postgres enum changes:** `ALTER TYPE ... ADD VALUE` must run **standalone** on Neon (not bundled in a transaction with other statements).

4. **Table name casing is mixed.** Confirm via `information_schema` before raw SQL:
   - Lowercase plural: `split_orders`, `stores`, `order_items`, `main_orders`, `addresses`, `vendor_ledger_entries`, `courier_ledger_entries`, etc.
   - Some quoted PascalCase columns on newer tables (e.g. `ticket_check_ins.deviceLabel`)

5. **After any schema change:** `prisma migrate deploy` → `prisma generate` → **restart dev server** (running server holds stale Prisma client → `PrismaClientValidationError`).

6. **Migration drift risk:** Some migrations (`20260518180000_add_completion_and_earnings`, `20260531212600_add_ticket_order`, others) were applied manually in Neon; `_prisma_migrations` may be out of sync. Reconcile with `prisma migrate resolve` before launch. **Never** `migrate reset` against production.

7. **Next.js / Server Action conventions:**
   - `"use server"` files export **async functions only**
   - `redirect()` never inside try/catch
   - Next 15+ dynamic route params: `const { id } = await params`

**Migrations folder:** `prisma/migrations/` — 63+ migration directories as of this snapshot.

---

## 20. Promo Codes & Oversell Protection (mechanics)

### Promo codes

**Schema:** `EventPromoCode` — `eventId`, `code` (unique per event), `discountType` (`PERCENT` or fixed minor), `discountValue`, `maxUses`, `usedCount`, `expiresAt`, `active`.

**Validation:** `validatePromoCode` — `app/actions/promo-codes.ts` (client-side preview); checkout re-validates inside Serializable transaction.

**Checkout:** `createTicketPaymentIntent` — `app/actions/ticket-checkout.ts`
- Promo normalized to uppercase
- Inside `prisma.$transaction(..., { isolationLevel: Serializable })`:
  - Re-fetch promo; `isPromoCodeRedeemable` (active, not expired, under maxUses)
  - `computePromoDiscountMinor` — PERCENT rounds; fixed caps at subtotal
  - `distributePricePaidMinor` — **largest-remainder** proportional discount across per-ticket `pricePaidMinor` rows; zero-floor
  - `orderTotalMinor === 0` → free path: `TicketOrder.status = PAID` immediately, tickets created, promo `usedCount` incremented, free confirmation email + notification
  - Paid path: `PENDING_PAYMENT` + Stripe PaymentIntent for `orderTotalMinor`
- Promo `usedCount: { increment: 1 }` is **atomic inside the same Serializable transaction** as seat check + order create

**Vendor CRUD:** `app/actions/promo-codes.ts` + `PromoCodesPanel` on event tickets page.

### Oversell protection

**Authoritative seat math:** `lib/tickets/sold-counts.ts`
- `SEAT_HOLD_MINUTES = 30` — `PENDING_PAYMENT` ticket orders younger than 30 minutes count as holding seats
- `assertAvailableSeatsForCheckout` — counts real `Ticket` rows grouped by `ticketTypeId` (not `quantitySold` alone)
- Paid tickets: `ticketOrder.status = PAID`; pending hold: `PENDING_PAYMENT` + `createdAt >= holdCutoff`

**Checkout transaction:** `createTicketPaymentIntent` runs `assertAvailableSeatsForCheckout` **twice** (pre-check + inside Serializable tx) before creating `TicketOrder` + `Ticket` rows.

**Known drift risk — `quantitySold` counter:**
- Incremented on free checkout (sync in tx) and on Stripe webhook paid path with **`.catch(console.error)`** — fire-and-forget
- UI availability in `TicketPurchaseCard` / `app/actions/cart.ts` still references `quantitySold` in places
- **Checkout gate uses real ticket row counts**; `quantitySold` mismatch can cause display/UX drift under load but Serializable checkout is the hard gate

**Webhook idempotency:** `handleTicketOrderPaid` uses `updateMany` where `status: PENDING_PAYMENT` — retries get `count=0` and skip re-processing.
