# LinkWe — Master Documentation

**Single source of truth for developers and AI assistants.**  
**Generated from codebase scan:** June 2026. Verify against `prisma/schema.prisma`, `package.json`, and route files after major merges.

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Tech stack](#2-tech-stack)
3. [Full database schema](#3-full-database-schema)
4. [Routes](#4-routes)
5. [Server actions](#5-server-actions)
6. [The money system](#6-the-money-system)
7. [The AI system](#7-the-ai-system)
8. [Stripe integration](#8-stripe-integration)
9. [Cron jobs](#9-cron-jobs)
10. [Environment variables](#10-environment-variables)
11. [Brand & design tokens](#11-brand--design-tokens)
12. [Migration discipline](#12-migration-discipline)
13. [Known gaps & TODO](#13-known-gaps--todo)
14. [Deployment](#14-deployment)

---

## 1. Project overview

**LinkWe** is a multi-vendor marketplace for **Trinidad & Tobago**. Vendors run stores; customers shop products, book services, buy event tickets, and message vendors. LinkWe operates warehouse/courier logistics for multi-vendor orders (split orders, dock bays, shipments). Admin tooling covers verification, payouts, and operations.

### Vendor content types

Vendors publish content through two parallel catalog systems (see [Known gaps](#13-known-gaps--todo)):

| Type | Primary models | Public routes |
|------|----------------|---------------|
| **Products** | `Product`, variants, cart | `/shop`, `/products/[slug]` |
| **Services** | `Product` (`isService`) / `Service` | `/services`, `/service/[slug]` |
| **Events & tickets** | `Event`, `EventTicketType`, `Ticket`, `TicketOrder` | `/events`, `/events/[slug]`, `/my-tickets` |
| **Vehicles** | `Vehicle` | Store tabs / listings |
| **Real estate** | `RealEstate` | Store tabs / listings |
| **Places** | `Place` | Store tabs |
| **Restaurants / food** | `FoodOutlet` | Store tabs |
| **Hotels / stays** | `Accommodation` | Store tabs |
| **Legacy listings** | `Listing` + typed sub-models (`ListingProduct`, `ListingVehicle`, …) | `/listing/[slug]` |

### User roles & post-login routing

| Role | Dashboard | Landing logic (`lib/auth/landing.ts`) |
|------|-----------|-------------------------------------|
| **CUSTOMER** | `/dashboard/customer` | Direct to role dashboard |
| **VENDOR** | `/dashboard/vendor` | Incomplete business onboarding → `/onboarding/business/step-{1\|2\|3}`; no store → step 3 |
| **COURIER** | `/dashboard/courier` | Incomplete courier onboarding → `/dashboard/courier/onboarding` |
| **ADMIN** | `/dashboard/admin` | Always `/dashboard/admin` |

Auth: JWT in httpOnly cookie (`lib/auth/token.ts`, `AUTH_SECRET`, `jose`). Role checks in dashboard layouts — **no root `middleware.ts`**.

Helpers: `getRoleDashboardPath()` (`lib/auth/redirects.ts`), `resolveAuthLandingPath()` (`lib/auth/landing.ts`).

---

## 2. Tech stack

From `package.json` (verified versions):

| Package | Version | Role |
|---------|---------|------|
| **next** | ^16.2.6 | App Router, RSC, Server Actions, API routes |
| **react** / **react-dom** | ^19.2.6 | UI |
| **typescript** | ^5 | Language |
| **tailwindcss** | ^4 | Styling (`@tailwindcss/postcss`) |
| **@prisma/client** / **prisma** | ^5.22.0 | ORM, PostgreSQL |
| **stripe** | ^22.0.2 | Payments, subscriptions, webhooks |
| **@stripe/stripe-js** / **@stripe/react-stripe-js** | ^9.2.0 / ^6.2.0 | Client Stripe Elements |
| **@anthropic-ai/sdk** | ^0.91.0 | Rex + Zara (Claude) |
| **cloudinary** | ^2.9.0 | Image uploads |
| **resend** | ^6.12.3 | Transactional email |
| **jose** | ^6.2.2 | JWT sessions |
| **bcryptjs** | ^3.0.3 | Password hashing |
| **mapbox-gl** / **react-map-gl** | ^3.22.0 / ^8.1.1 | Maps |
| **@react-google-maps/api** | ^2.20.8 | Google Maps (Places fallback) |
| **@tiptap/** | ^3.23.4 | Rich text editor |
| **@react-pdf/renderer** | ^4.5.1 | PDF invoices/tickets |
| **exceljs**, **papaparse**, **csv-parse** | — | Bulk import/export |
| **html5-qrcode**, **qrcode** | — | Event check-in / ticket QR |
| **recharts** | ^3.8.1 | Dashboard charts |
| **zustand** | ^5.0.12 | Client state |
| **sonner** | ^2.0.7 | Toasts |
| **leaflet** | ^1.9.4 | Legacy map usage |
| **canvas-confetti** | ^1.9.4 | UI delight |
| **idb** | ^8.0.3 | Offline check-in IndexedDB |

**Architecture:** Next.js **App Router** (`app/`), Server Actions (`app/actions/*.ts`, `"use server"`), PostgreSQL via Prisma, Stripe for payments, Vercel deployment.

---

## 3. Full database schema

Source: `prisma/schema.prisma`. PostgreSQL. Table names use `@@map("snake_case")`.

### 3.1 Auth & users

#### `User` → `users`
Core account: `email`, `phone`, `passwordHash`, `fullName`, `role` (`UserRole`), `region`, ID verification fields, courier onboarding (`courierOnboardingStep`, `vehicleType`, `courierBio`), `suspended`, vendor bank fields (legacy; prefer `VendorBankDetails`).

#### `VendorBankDetails`
One-to-one with vendor user: bank name, account name/number, `AccountType`.

#### `CourierBankDetails` → `courier_bank_details`
Courier payout bank details.

#### `Address` → `addresses`
Shipping addresses: lines, city, region, country, phone, lat/lng.

#### `RateLimit` → `rate_limits`
API rate limiting buckets.

---

### 3.2 Stores & vendor profile

#### `Store` → `stores`
Vendor storefront: `ownerId`, `name`, `slug`, `categoryId`, `region`, media, `openingHours`, `tags`, `status` (`StoreStatus`), `onboardingStep`, geo, `staffMode`, `shippingMode` (`StoreShippingMode`: SELF | LINKWE).

**Subscription fields (billing):**

| Field | Type | Purpose |
|-------|------|---------|
| `subscriptionPlan` | `VendorSubscriptionPlan` | STARTER / GROWTH / PRO — commission & limits |
| `subscriptionStatus` | `StoreSubscriptionStatus` | NONE / ACTIVE / PAST_DUE / CANCELED |
| `planRenewsAt` | `DateTime?` | Next renewal (from Stripe webhooks) |
| `pastDueSince` | `DateTime?` | First failed payment timestamp (7-day grace) |
| `stripeCustomerId` | `String?` | Stripe Customer |
| `stripeSubscriptionId` | `String?` | Active Stripe subscription (card auto-bill signal) |
| `autoRenew` | `Boolean` @default(true) | Card auto-renew on/off (`cancel_at_period_end` mirror) |

#### `StoreImage`, `VendorThreshold`, `VendorShippingRate`
Gallery images, minimum payout threshold, per-zone shipping rates.

#### `StaffMember`, `StaffAvailability`, `StaffAvailabilityOverride`, `StaffService`
Multi-staff booking: staff roster, weekly schedules, overrides, service assignments.

---

### 3.3 Catalog — dual systems

#### Legacy: `Listing` → `listings`
Unified listing row with `ListingType` discriminator and typed extensions:

- `ListingProduct` → `products` (note: table name `products` but **not** the modern `Product` model)
- `ListingProductVariant`, `ListingRealEstate`, `ListingVehicle`, `ListingEvent`, `ListingService`, `ListingRestaurant`, `ListingPlace`, `ListingTicket`, `ListingDigital`, `ListingBookable`

Key: `priceMinor`, `currency` (default **USD**), `status` (`ListingStatus`).

#### Modern typed catalog (store-scoped)

| Model | Purpose |
|-------|---------|
| **`Product`** | Primary product/service catalog: price (`Float`), stock, images, digital/bookable/service flags, availability, booking fields |
| **`ProductVariant`** | SKU variants |
| **`ProductAvailabilitySchedule` / `Override` / `ProductBookingSlot`** | Bookable availability |
| **`ProductBooking`** | Service bookings linked to slots |
| **`RealEstate`** | Property listings |
| **`Vehicle`** | Vehicle listings |
| **`Event`** | Events with ticketing, lineup JSON, scan codes |
| **`EventTicketType`** | Ticket tiers, pricing, inventory |
| **`Place`** | Points of interest |
| **`FoodOutlet`** | Restaurants / food |
| **`Accommodation`** | Hotels / stays |
| **`Service`** | Standalone service records (parallel to `Product.isService`) |

#### Content relationships
- `StoreContentRelationship` — cross-store feature requests (PENDING/APPROVED/REJECTED)
- `ContentLink` — same-store content linking

---

### 3.4 Cart & orders

| Model | Purpose |
|-------|---------|
| **`Cart` / `CartItem`** | Legacy listing-based cart |
| **`ProductCartItem`** | Modern product cart |
| **`EventTicketCartItem`** | Event ticket cart lines |
| **`MainOrder`** | Customer checkout order (minor units TTD): status lifecycle, shipping zone, totals |
| **`OrderItem`** | Line items — `listingId` **or** `productId`, `priceMinor`, quantity |
| **`SplitOrder`** | Per-vendor fulfillment slice: extensive `SplitOrderStatus` workflow, earnings release, auto-complete |
| **`SplitOrderItem`** | Items in a split |
| **`ShippingBundle`** | Groups splits for outbound dispatch |
| **`Shipment`** | Courier/warehouse shipments |
| **`DockBay`** | Warehouse bay assignment |
| **`Warehouse` / `WarehouseInventory` / `WarehouseOrderLine`** | Warehouse ops (some models dormant per project rules) |
| **`OrderDocument`** | Invoices, receipts, etc. |

---

### 3.5 Finance & payouts

#### `VendorLedgerEntry` → `vendor_ledger_entries`
Vendor balance ledger. Key fields: `entryType` (`VendorLedgerEntryType`), `ledgerEntryType` (`LedgerEntryType`), `amountMinor`, `idempotencyKey`, gross/commission/net, `releasedAt`.

**`VendorLedgerEntryType`:** `CREDIT_ORDER_SETTLEMENT`, `DEBIT_PAYOUT`, `DEBIT_REFUND`, **`DEBIT_SUBSCRIPTION`**, `DEBIT_PLATFORM_FEE`, `CREDIT_ADJUSTMENT`, `DEBIT_ADJUSTMENT`, `CREDIT_REVERSAL`.

**`LedgerEntryType` (categorization):** `ORDER_REVENUE`, `PLATFORM_COMMISSION`, `PAYOUT`, `BOOKING_COMPLETE`, `BOOKING_AUTO_COMPLETE`, `DEPOSIT_RECEIVED`, `ORDER_AUTO_COMPLETE`, `TICKET_SALE`, `SHIPPING`, **`SUBSCRIPTION`**, etc.

#### `PayoutRequest`
Vendor withdrawal requests: `amountMinor`, `status` (`PayoutStatus`), beneficiary user.

#### Courier finance
`CourierLedgerEntry`, `CourierPayoutRequest` — pickup earnings and payouts.

#### `AIUsage` → `ai_usage`
Per-store per-period AI metering: `periodKey`, `count`, token totals.

---

### 3.6 Events & ticketing

| Model | Purpose |
|-------|---------|
| **`TicketOrder`** | Stripe ticket checkout order (`PENDING_PAYMENT` → `PAID`); separate from `MainOrder` |
| **`Ticket`** | Individual ticket with `qrToken`, holder info, check-in state |
| **`TicketCheckIn`** | Check-in audit log |
| **`EventPromoCode`** | Discount codes |
| **`EventWaitlist`** | Waitlist (schema present; auto-promotion not fully built) |

**Enums:** `EventStatus`, `TicketStatus`, `TicketOrderStatus`, `RefundPolicyType`.

---

### 3.7 Bookings & on-demand

| Model | Purpose |
|-------|---------|
| **`ProductBooking`** | Paid service bookings; `autoCompleteAt`, `earningsReleased` |
| **`OnDemandRequest`** | Custom quote/on-demand jobs between customer and vendor |

**Enums:** `BookingStatus`, `BookingType`, `BookingPaymentMode`, `OnDemandRequestStatus`, `ServiceType`, `ServiceLocation`, `QuotePriceType`.

---

### 3.8 Social & messaging

| Model | Purpose |
|-------|---------|
| **`Review`** | Product/store/service reviews; vendor replies |
| **`Wishlist` / `WishlistItem`**, **`SavedStore`** | Customer saves |
| **`Notification`** | In-app notifications (`NotificationType`) |
| **`VendorChat` / `VendorChatMessage`** | Legacy vendor AI chat persistence |
| **`Conversation` / `Message`** | Customer ↔ store messaging |
| **`AIChatSession` / `AIMessage`** | Structured AI session logging (customer shopping) |

---

### 3.9 All enums (values)

| Enum | Values |
|------|--------|
| `NotificationType` | ORDER_PLACED, ORDER_STATUS_UPDATED, BOOKING_CONFIRMED, BOOKING_CANCELLED, ON_DEMAND_*, REVIEW_RECEIVED, PAYOUT_PROCESSED, GENERAL, TICKET_PURCHASED, MESSAGE_RECEIVED |
| `UserRole` | CUSTOMER, VENDOR, COURIER, ADMIN |
| `IdVerificationStatus` | UNSUBMITTED, PENDING, APPROVED, REJECTED |
| `StoreStatus` | DRAFT, PENDING_APPROVAL, ACTIVE |
| `StoreShippingMode` | SELF, LINKWE |
| `ListingType` | PRODUCT, REAL_ESTATE, VEHICLE, EVENT, SERVICE, RESTAURANT, PLACE, TICKET, DIGITAL, BOOKABLE |
| `ListingStatus` | DRAFT, PUBLISHED, ARCHIVED, SUSPENDED |
| `CartStatus` | ACTIVE, ABANDONED, CONVERTED |
| `MainOrderStatus` | DRAFT, PENDING_PAYMENT, PAID, PROCESSING, … COMPLETED, CANCELLED, REFUNDED |
| `PayoutStatus` | PENDING, APPROVED, PROCESSING, PAID, FAILED, CANCELLED |
| `SplitOrderStatus` | AWAITING_VENDOR_ACTION, PREPARING, READY_FOR_LINKWE, … DELIVERED, COMPLETED, CANCELLED |
| `WarehouseLineStatus` | OUTSIDE, CHECKED |
| `ShipmentStatus` | PENDING, READY_FOR_PICKUP, IN_TRANSIT, … DELIVERED_TO_WAREHOUSE, DELIVERED_TO_CUSTOMER |
| `ShipmentType` | INBOUND_COURIER_PICKUP, OUTBOUND_DELIVERY |
| `LedgerEntryType` | ORDER_REVENUE, COURIER_PICKUP_FEE, PLATFORM_COMMISSION, PAYOUT, ADJUSTMENT, BOOKING_*, DEPOSIT_RECEIVED, ORDER_AUTO_COMPLETE, TICKET_SALE, SHIPPING, **SUBSCRIPTION** |
| `VendorSubscriptionPlan` | STARTER, GROWTH, PRO |
| `StoreSubscriptionStatus` | NONE, ACTIVE, PAST_DUE, CANCELED |
| `VendorInboundMethod` | PICKUP_REQUESTED, VENDOR_DROPOFF |
| `ProductSubtype` | SIMPLE, VARIABLE, DIGITAL, BOOKABLE, TICKET |
| `ShippingBundleStatus` | OPEN, BUNDLING, BUNDLED, RELEASED_FOR_SHIPPING, SHIPPED, CANCELLED |
| `VendorLedgerEntryType` | CREDIT_ORDER_SETTLEMENT, DEBIT_PAYOUT, DEBIT_REFUND, **DEBIT_SUBSCRIPTION**, DEBIT_PLATFORM_FEE, CREDIT/DEBIT_ADJUSTMENT, CREDIT_REVERSAL |
| `OrderDocumentType` | INVOICE, RECEIPT, PACKING_SLIP, TAX_SUMMARY, CREDIT_NOTE, OTHER |
| `AIChatSessionType` | CUSTOMER_SHOPPING, VENDOR_LISTING, SUPPORT, ADMIN |
| `AIMessageRole` | SYSTEM, USER, ASSISTANT, TOOL |
| `ProductCondition` | NEW, USED, REFURBISHED |
| `WeightUnit` | KG, LB |
| `LicenceType` | PERSONAL, COMMERCIAL, EXTENDED |
| `BookingType` | SINGLE_SESSION, MULTI_SESSION, RECURRING |
| `BookingStatus` | PENDING, CONFIRMED, DEPOSIT_PAID, CANCELLED, COMPLETED, NO_SHOW |
| `CancelledBy` | CUSTOMER, VENDOR, SYSTEM |
| Real estate / vehicle / food / accommodation enums | See schema lines 1199–1300 |
| `ServicePriceType` | FIXED, HOURLY, QUOTED |
| `RelationshipStatus` | PENDING, APPROVED, REJECTED |
| `AccountType` | CHEQUING, SAVINGS |
| `CourierEntryType` | PICKUP_EARNING, PAYOUT, ADJUSTMENT |
| `ServiceType` | BOOKABLE, QUOTE, SUBSCRIPTION, ON_DEMAND, VIRTUAL |
| `ServiceLocation` | AT_VENDOR, AT_CUSTOMER, VIRTUAL, FLEXIBLE |
| `BookingPaymentMode` | ONLINE_ONLY, ON_ARRIVAL_ONLY, CUSTOMER_CHOOSES |
| `QuotePriceType` | FIXED, HOURLY, PER_SQUARE_FOOT, PER_ITEM |
| `StaffMode` | SOLO, MULTI |
| `OnDemandRequestStatus` | PENDING, ACCEPTED, CONFIRMED, DECLINED, COMPLETED, CANCELLED |
| `EventStatus` | DRAFT, PUBLISHED, CANCELLED, COMPLETED |
| `TicketStatus` | VALID, USED, CANCELLED, REFUNDED |
| `TicketOrderStatus` | PENDING_PAYMENT, PAID, FAILED, CANCELLED |
| `RefundPolicyType` | FULL, PARTIAL, NONE |

---

## 4. Routes

**113 routable endpoints:** 100 `page.tsx` + 13 API `route.ts`. Route groups `(dashboard)`, `(auth)`, `(storefront)` do not appear in URLs.

### Public storefront (selected)

| Path | Purpose |
|------|---------|
| `/` | Marketing home |
| `/shop`, `/products/[slug]` | Product catalog & PDP |
| `/services`, `/service/[slug]` | Services directory & detail |
| `/events`, `/events/[slug]` | Events & ticket purchase |
| `/stores`, `/store/[slug]`, `/stores/[slug]` | Store discovery & storefront |
| `/listing/[slug]` | Legacy listing detail |
| `/search` | Universal search |
| `/chat` | Zara AI shopping assistant |
| `/cart`, `/checkout` | Cart & Stripe checkout |
| `/orders`, `/orders/[orderId]` | Order history |
| `/bookings`, `/my-tickets`, `/my-requests` | Customer activity |
| `/messages`, `/messages/[conversationId]` | Store messaging |
| `/checkin/[qrToken]`, `/scan/[eventId]` | Ticket check-in |
| `/pricing`, `/about`, `/faq`, `/contact`, legal pages | Marketing |

### Auth

| Path | Purpose |
|------|---------|
| `/login`, `/register`, `/register/{customer,courier,business}` | Auth |
| `/forgot-password`, `/reset-password` | Password reset |

### Onboarding

| Path | Purpose |
|------|---------|
| `/onboarding/business/step-{1,2,3}` | Vendor business setup |
| `/onboarding/courier` | Legacy courier redirect |
| `/dashboard/courier/onboarding` | Courier vehicle/region setup |

### Dashboards

| Area | Base | Key pages |
|------|------|-----------|
| **Vendor** | `/dashboard/vendor` | products, services, events, orders, bookings, finance, ai-assistant, messages, shipping, staff, partners, settings |
| **Admin** | `/dashboard/admin` | overview tabs, users, stores, products, listings, verification, messages, settings |
| **Courier** | `/dashboard/courier` | jobs, bank, settings |
| **Customer** | `/dashboard/customer` | hub, settings |

### API routes

| Path | Method | Purpose |
|------|--------|---------|
| `/api/search` | GET | Universal search |
| `/api/products/search`, `/api/stores/search` | GET | Autocomplete |
| `/api/chat` | POST | Zara streaming chat |
| `/api/vendor-ai` | POST | Rex vendor AI |
| `/api/booking-checkout` | POST | Booking Stripe checkout session |
| `/api/webhooks/stripe` | POST | Stripe webhooks |
| `/api/cron/auto-complete` | GET | Daily cron sweeps |
| `/api/invoice/[orderId]` | GET | Customer invoice PDF |
| `/api/vendor-invoice/[splitOrderId]` | GET | Vendor invoice PDF |
| `/api/ticket-pdf/[ticketId]` | GET | Ticket PDF + QR |
| `/api/linkwe-manifest` | GET | Admin shipping manifest PDF |
| `/api/contact` | POST | Contact form email |

Full page list: see agent inventory or `find app -name page.tsx`.

---

## 5. Server actions

**Location:** `app/actions/*.ts` (70 files, ~292 exported functions).  
**Pattern:** `"use server"` → `getSession()` → role check → Prisma → `{ ok }` / redirect → `revalidatePath()`.

### Domain index

| File | Key actions |
|------|-------------|
| **`vendor.ts`** | Bank details, payouts, **`payMySubscriptionFromBalance`**, **`startSubscriptionCheckout`**, **`cancelAutoRenew`**, **`resumeAutoRenew`** |
| **`admin-stores.ts`** | Store admin, **`setVendorPlan`**, **`chargeVendorSubscriptionFromBalance`** |
| **`checkout.ts`** | Payment intent, order creation, confirm paid |
| **`cart.ts`** | Cart CRUD, event tickets |
| **`booking.ts` / `bookings.ts`** | Service booking lifecycle, earnings release |
| **`ticket-checkout.ts` / `tickets.ts` / `my-tickets.ts`** | Ticket purchase, transfer |
| **`events.ts` / `promo-codes.ts` / `ticket-checkin.ts`** | Event CRUD, promos, check-in |
| **`product.ts` / `product-variants.ts` / `product-bulk.ts`** | Product CRUD |
| **`services.ts` / `availability.ts` / `staff.ts`** | Services & scheduling |
| **`fulfillment.ts` / `assembly.ts` / `warehouse.ts` / `courier-ops.ts`** | Order fulfillment pipeline |
| **`admin-orders.ts` / `admin-payouts.ts` / `admin-vendors.ts`** | Admin ops |
| **`ai-vendor.ts` / `ai-vendor-image.ts` / `ai-vendor-update.ts` / `ai-bulk-upload.ts`** | Rex tool backends |
| **`messages.ts` / `notifications.ts`** | Messaging & alerts |
| **`on-demand.ts` / `cross-store.ts` / `content-links.ts`** | On-demand & partnerships |
| **`vendor-shipping.ts` / `store.ts` / `reviews.ts`** | Store ops |
| **`courier.ts` / `courier-payout.ts` / `courier-bank.ts` / `courier-location.ts`** | Courier |
| **`password-reset.ts` / `settings.ts`** | Account |
| **`wishlist.ts` / `public-stores.ts` / `search.ts`** | Discovery |

See each file for the full export list.

---

## 6. The money system

### 6.1 Commission (`lib/finance/commission.ts`)

Plan-tier rates (products vs services):

| Plan | Product | Service |
|------|---------|---------|
| STARTER | 15% | 8% |
| GROWTH | 12% | 5% |
| PRO | 8% | 3% |

**Tickets:** flat **6%** (`TICKET_COMMISSION_RATE`) — not plan-tiered.

Helpers: `calculateEarnings`, `calculateEarningsMinor`, `ttdToMinor` / `minorToTtd`.

### 6.2 Vendor balance (`lib/finance/vendor-balance.ts`, `lib/finance/release-earnings.ts`)

**Available balance** = sum(`CREDIT_ORDER_SETTLEMENT`) − sum(debits in `VENDOR_BALANCE_DEBIT_TYPES`):

- `DEBIT_PLATFORM_FEE`, `DEBIT_PAYOUT`, `DEBIT_REFUND`, **`DEBIT_SUBSCRIPTION`**

`getVendorAvailableBalanceMinor(storeId)` in `release-earnings.ts`.

Earnings release writes ledger credits with gross/commission/net on completion of orders, bookings, tickets.

### 6.3 Subscription plans (`lib/finance/plan-limits.ts`)

| Plan | Price (TTD/mo) | Product cap | AI uses/mo |
|------|----------------|-------------|------------|
| STARTER | Free (0) | 30 | 0 |
| GROWTH | TTD 200 (`20000` minor) | 300 | 300 |
| PRO | TTD 450 (`45000` minor) | Unlimited | 1000 |

Single source: `PLAN_LIMITS`, `PLAN_PRICE_MINOR`. Plan resolution: `lib/finance/store-plan.ts` → `resolveVendorPlan()` (plan from `subscriptionPlan` only; status passed but limits don't gate on PAST_DUE today).

### 6.4 Card subscription checkout

**`startSubscriptionCheckout(targetPlan)`** (`app/actions/vendor.ts`):
- Creates/reuses Stripe Customer on store
- Stripe Checkout `mode: "subscription"`, currency **`ttd`**, recurring monthly
- Metadata: `subscriptionStoreId`, `targetPlan`
- Success/cancel URLs → `/dashboard/vendor/finance?sub=success|cancelled`

### 6.5 Pay from balance

**`chargeSubscriptionFromBalance()`** (`lib/finance/subscription-billing.ts`):
- Idempotency key: `subscription:{storeId}:{periodKey}` via `getCurrentPeriodKey(planRenewsAt)`
- Writes `DEBIT_SUBSCRIPTION` + `ledgerEntryType: SUBSCRIPTION`
- Does **not** change `subscriptionPlan` or Stripe fields

**`payMySubscriptionFromBalance()`** (`app/actions/vendor.ts`):
- **Guard:** refuses if `stripeSubscriptionId && autoRenew` → `card_subscription_active`
- Allows balance-pay when auto-renew is off (card sub still active until period end) or no card sub

**Admin:** `chargeVendorSubscriptionFromBalance(storeId)` in `admin-stores.ts`.

### 6.6 Card-first reconciliation rules

| Signal | Meaning |
|--------|---------|
| `stripeSubscriptionId != null` | Has (or had) Stripe card subscription |
| `autoRenew === true` | Stripe will charge card — **hide/refuse balance-pay** |
| `autoRenew === false` | Cancel at period end — **allow balance-pay** for current period |
| `subscriptionStatus === PAST_DUE` | Failed payment — show warning UI; 7-day grace before downgrade |

**Auto-renew toggle:**
- **`cancelAutoRenew()`** → `stripe.subscriptions.update(id, { cancel_at_period_end: true })`, `autoRenew: false`
- **`resumeAutoRenew()`** → `cancel_at_period_end: false`, `autoRenew: true`

### 6.7 Past-due grace & downgrade

**Webhook `invoice.payment_failed`:** ACTIVE → `PAST_DUE`, sets `pastDueSince` (first failure only — where still ACTIVE).

**Webhook `invoice.paid`:** → ACTIVE, clears `pastDueSince`, updates `planRenewsAt`.

**Cron** (`app/api/cron/auto-complete/route.ts`, `GRACE_DAYS = 7`):
- Finds `PAST_DUE` + `stripeSubscriptionId` + `pastDueSince <= now - 7 days`
- `stripe.subscriptions.cancel(id)` then DB reset to STARTER/NONE, clear Stripe fields, `autoRenew: true`

**Webhook `customer.subscription.deleted`:** Same Starter reset when Stripe ends subscription (natural period end or cancel).

### 6.8 Stripe webhook subscription field paths (API `2026-03-25.dahlia`)

File: `app/api/webhooks/stripe/route.ts`

| Event | Key paths |
|-------|-----------|
| `checkout.session.completed` (subscription) | `metadata.subscriptionStoreId`, `metadata.targetPlan`, `subscription` id |
| `invoice.paid` / `invoice.payment_succeeded` | `invoice.parent.subscription_details.metadata.subscriptionStoreId`, `subscription_details.subscription`, `lines.data[].period.end`, `invoice.period_end` |
| `invoice.payment_failed` | Same `parent.subscription_details.metadata.subscriptionStoreId` |
| `customer.subscription.deleted` | `subscription.metadata.subscriptionStoreId`, match `stripeSubscriptionId` |
| `payment_intent.succeeded` | `metadata.orderId`, `metadata.bookingId`, `metadata.ticketOrderId` |

**Period end retrieval:** `resolveRenewalDate()` uses `sub.items.data[0].current_period_end` from `stripe.subscriptions.retrieve`.

### 6.9 AI metering (`lib/finance/ai-usage.ts`, `ai-usage-period.ts`)

- Allowance from `PLAN_LIMITS[plan].aiMonthlyAllowance`
- **Period key:** calendar month (`cal-YYYY-MM`) if no `planRenewsAt`; else renewal-aligned (`renew-YYYY-MM-DD`)
- Stored in `AIUsage` per `(storeId, periodKey)`
- **`consumeAIUse(store)`** — increments count, returns remaining
- **`recordAITokens()`** — accumulates prompt/completion token totals

### 6.10 Currency note

- **Vendor-facing balances, subscriptions, checkout:** predominantly **TTD** (minor units = cents)
- **Legacy `Listing` model:** default currency **USD** (`priceMinor`)
- **Stripe:** checkout/subscriptions configured with `currency: "ttd"` for vendor plans; some listing flows reference USD
- **On-demand ledger copy** mentions "paid in USD equivalent" — no centralized FX module found; treat as presentation inconsistency

---

## 7. The AI system

### 7.1 Assistants

| Assistant | Route | User | System prompt |
|-----------|-------|------|---------------|
| **Zara** | `POST /api/chat` | Customers | `LINKWE_SYSTEM_PROMPT` — `lib/chat/systemPrompt.ts` |
| **Rex** | `POST /api/vendor-ai` | Vendors | `VENDOR_SYSTEM_PROMPT` — `lib/chat/vendorSystemPrompt.ts` |

**Model:** `claude-sonnet-4-5` on both routes.

### 7.2 Prompt caching (Step 4b)

Both routes use Anthropic **ephemeral cache**:
- Static system prompt block with `cache_control: { type: "ephemeral" }`
- Dynamic blocks (product context / upload context) uncached
- Last tool definition gets cache marker
- Token logs include `cacheWrite` / `cacheRead`

### 7.3 Zara tools (`app/api/chat/route.ts`)

| Tool | Purpose |
|------|---------|
| `add_to_cart` | Add product to cart |
| `add_multiple_to_cart` | Batch add |
| `add_event_tickets_to_cart` | Event tickets |
| `search_events` | Event discovery (`SEARCH_EVENTS_TOOL` from systemPrompt) |

Product search uses server-side context injection (not a separate named tool in current route).

### 7.4 Rex tools (`app/api/vendor-ai/route.ts`) — 27 tools

Includes: `create_product`, `update_product`, `search_vendor_products`, image gallery tools, `create_service`, store summary/sales/inventory/orders, `create_event`, `update_event`, ticket types, publish/unpublish, bookings summary, event image uploads, etc.

### 7.5 Gating & metering

- **`consumeAIUse()`** before Rex tool runs (vendor store plan)
- **`assertVendorSession()`** / **`getMyAIUsage()`** in `app/actions/ai-vendor.ts`
- Starter plan: 0 AI allowance (blocked with message)

### 7.6 Image pipeline

- Uploads via Cloudinary (`app/actions/ai-vendor-image.ts`, event uploads)
- **`isTrustedHostedImageUrl`** (`lib/images/trusted-host.ts`) — Rex rejects non-Cloudinary URLs for event images
- Vision: base64 image blocks in Anthropic messages (full-page Rex assistant)

### 7.7 UX patterns

- Streaming text deltas + typewriter buffer in chat UIs
- Zara product cards via fenced ` ```products ` JSON blocks
- Vendor chat persistence: `VendorChat` model + `app/actions/vendor-chat.ts`

---

## 8. Stripe integration

### Shared client

```typescript
// lib/stripe/stripe.ts
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia",
});
```

### Test vs live

Controlled by env keys:
- `STRIPE_SECRET_KEY` (server)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client Elements)
- `STRIPE_WEBHOOK_SECRET` (webhook signature)

### Flows using Stripe

| Flow | Mechanism |
|------|-----------|
| **Product checkout** | PaymentIntent — `app/actions/checkout.ts` |
| **Service bookings** | PaymentIntent / `/api/booking-checkout` |
| **Event tickets** | PaymentIntent — `app/actions/ticket-checkout.ts` |
| **On-demand** | Checkout session (metadata `requestId`) |
| **Vendor subscriptions** | Checkout subscription + recurring invoices |
| **Ticket refunds** | `app/actions/ticket-refund.ts` |

### Webhook endpoint

**`POST /api/webhooks/stripe`** — production URL: `https://www.linkweonlinemall.com/api/webhooks/stripe`

**Handled events:**
- `checkout.session.completed` — on-demand confirm, subscription activate
- `invoice.paid`, `invoice.payment_succeeded` — subscription renewal
- `invoice.payment_failed` — past due
- `customer.subscription.deleted` — downgrade to Starter
- `payment_intent.succeeded` — orders, bookings, tickets

**Not handled:** `customer.subscription.updated` (auto-renew state synced via vendor actions only).

Configure in Stripe Dashboard: include invoice and subscription deletion events.

---

## 9. Cron jobs

### Schedule (`vercel.json`)

```json
{
  "crons": [{
    "path": "/api/cron/auto-complete",
    "schedule": "0 2 * * *"
  }]
}
```

**Daily at 02:00 UTC.**

### Auth

```typescript
const secret = request.headers.get("x-cron-secret");
if (!secret || secret !== process.env.CRON_SECRET) return 401;
```

Vercel cron must send `x-cron-secret` header matching `CRON_SECRET`.

### Sweeps (`app/api/cron/auto-complete/route.ts`)

| Sweep | Query | Action |
|-------|-------|--------|
| **Bookings** | `autoCompleteAt <= now`, not released, CONFIRMED/DEPOSIT_PAID | `releaseBookingEarnings` |
| **Split orders** | `autoCompleteAt <= now`, DELIVERED, not released | `releaseSplitOrderEarnings` |
| **Ticket orders** | `payoutEligibleAt <= now`, PAID, not released | `releaseTicketOrderEarnings` |
| **Past-due subscriptions** | PAST_DUE + stripe sub + pastDueSince > 7 days | Stripe cancel + Starter downgrade |

Response JSON: `{ bookingsCompleted, ordersCompleted, ticketOrdersReleased, pastDueDowngraded }`.

---

## 10. Environment variables

From `.env.example` + code references:

| Variable | In `.env.example`? | Purpose |
|----------|-------------------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL (local dev / Neon prod) |
| `NEXT_PUBLIC_BASE_URL` | ✅ | App URL for emails/links |
| `NEXT_PUBLIC_APP_URL` | ❌ | Fallback base URL (`lib/app-base-url.ts`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe.js client |
| `STRIPE_SECRET_KEY` | ✅ | Stripe server API |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Webhook signature verification |
| `CRON_SECRET` | ✅ | Cron auth header |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Image CDN |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary |
| **`AUTH_SECRET`** | ❌ **Required** | JWT signing, min 32 chars (`lib/auth/token.ts`) |
| **`ANTHROPIC_API_KEY`** | ❌ **Required** | Rex + Zara |
| **`RESEND_API_KEY`** | ❌ **Required** | Email (`lib/email/resend.ts`) |
| **`RESEND_FROM_EMAIL`** | ❌ | From address (default `noreply@linkweonlinemall.com`) |
| **`NEXT_PUBLIC_MAPBOX_TOKEN`** | ❌ | Maps (checkout, storefront) |
| **`NEXT_PUBLIC_GOOGLE_PLACES_KEY`** | ❌ | Address autocomplete fallback |

---

## 11. Brand & design tokens

### CSS variables (`app/globals.css`)

| Token | Value | Use |
|-------|-------|-----|
| `--scarlet` / `--brand-red` | `#D4450A` | Primary CTA, brand |
| `--scarlet-hover` | `#B83A09` | Hover |
| `--amber` / `--brand-amber` | `#E8820C` | Accent |
| `--blue` / `--brand-blue` | `#1A7FB5` | Info/links |
| `--dark` | `#1C1C1A` | Admin nav, headings |
| `--background` / `--surface` | `#F5F5F5` | Page background |
| `--text-primary` | `#1C1C1A` | Body headings |
| `--text-muted` | `#7C7B77` | Secondary text |
| `--font-display` / `--font-sora` | Sora | Typography |

Body: `font-family: var(--font-sora), sans-serif`; loaded in `app/layout.tsx`.

### TypeScript tokens (`lib/design-system.ts`)

Exports `colors`, `typography`, `spacing`, `radius`, `shadow`, `tw` (Tailwind class bundles), `css` (gradients).

---

## 12. Migration discipline

**Production database:** Neon PostgreSQL. **Never** run `prisma migrate dev`, `db push`, or `reset` against Neon from automation.

### Local workflow

1. Edit `prisma/schema.prisma`
2. Create migration locally: `npx prisma migrate dev --name descriptive_slug` (or hand-write SQL in `prisma/migrations/`)
3. Apply locally: `npx prisma migrate deploy` against local `linkwe_dev`
4. `npx prisma generate`

### Production (manual)

1. Copy **FULL SQL** from migration file
2. Run in Neon SQL editor
3. Insert into `_prisma_migrations` with **real checksum** from local migration record
4. **Enum changes:** `ALTER TYPE ... ADD VALUE` must run as standalone statement (not inside multi-statement transaction)

### Known drift

Some migrations were hand-applied to Neon before `_prisma_migrations` sync (`CLAUDE_CONTEXT.md`). Reconcile with `prisma migrate resolve` before relying on automated deploy.

**Recent subscription migrations (local):**
- `20260622120000_add_subscription_ledger_types` — DEBIT_SUBSCRIPTION, SUBSCRIPTION enum
- `20260623120000_add_store_past_due_since` — `past_due_since` column
- `20260624120000_add_store_auto_renew` — `auto_renew` boolean default true

---

## 13. Known gaps & TODO

### Architecture / data

- **Dual catalog:** Modern `Product` + legacy `Listing` coexist; checkout supports both via `OrderItem.listingId | productId`
- **Currency inconsistency:** TTD in checkout/subscriptions; USD default on `Listing`; no shared FX layer
- **Migration drift:** Production Neon may lack `_prisma_migrations` rows for hand-applied SQL
- **SECURITY:** Production `DATABASE_URL` exposure noted in `CLAUDE_CONTEXT.md` — rotate Neon credentials

### Subscriptions / billing

- No **`customer.subscription.updated`** webhook — `autoRenew` only synced via LinkWe actions
- No Stripe Billing Portal ("Manage billing") — finance UI uses Checkout for card updates
- Admin-assigned plans (`setVendorPlan`) set ACTIVE without Stripe fields — balance-pay path only

### Ticketing / events

- Waitlist auto-promotion incomplete
- `quantitySold` increment uses `.catch(console.error)` — oversell risk under load

### Product / ops

- Webhook error handler returns stack traces — trim before hardening
- `.env.example` incomplete vs runtime requirements

### CLAUDE_CONTEXT.md staleness (vs codebase June 2026)

| Topic | CLAUDE_CONTEXT | Actual |
|-------|----------------|--------|
| Next.js version | Often referenced as 14 | **16.2.6** in `package.json` |
| Vendor subscriptions | Listed as "still to build" | **Built** (card, balance, auto-renew, past-due, cron) |
| `/my-tickets` | Was TODO / 404 | **Implemented** |
| Cron schedule | `.env.example` says "hourly" | **Daily 02:00 UTC** in `vercel.json` |
| React | — | **19.2.6** |

---

## 14. Deployment

- **Host:** Vercel (project linked to repo)
- **Build:** `npm run build` (`next build`)
- **Deploy trigger:** Git push to **`main`** (standard Vercel Git integration)
- **Postinstall:** `prisma generate` (via `package.json` scripts)
- **Production URL:** `https://www.linkweonlinemall.com`
- **Webhook URL:** `https://www.linkweonlinemall.com/api/webhooks/stripe`

### Pre-deploy checklist

- [ ] Neon migrations applied + `_prisma_migrations` synced
- [ ] All required env vars set in Vercel
- [ ] Stripe webhook events enabled
- [ ] `CRON_SECRET` configured for Vercel cron + route
- [ ] `npm run build` passes locally

---

## Quick file reference

| Area | Path |
|------|------|
| Schema | `prisma/schema.prisma` |
| Auth | `lib/auth/session.ts`, `lib/auth/token.ts`, `lib/auth/landing.ts` |
| Commission / plans | `lib/finance/commission.ts`, `plan-limits.ts`, `store-plan.ts` |
| Subscriptions | `lib/finance/subscription-billing.ts`, `app/actions/vendor.ts` |
| Webhooks | `app/api/webhooks/stripe/route.ts` |
| Cron | `app/api/cron/auto-complete/route.ts`, `vercel.json` |
| Vendor finance UI | `app/(dashboard)/dashboard/vendor/finance/page.tsx`, `finance-tab.tsx` |
| Rex / Zara | `app/api/vendor-ai/route.ts`, `app/api/chat/route.ts` |
| Design | `app/globals.css`, `lib/design-system.ts` |
| Context doc (legacy) | `CLAUDE_CONTEXT.md` |

---

*End of ALL_LINKWE.md*
