-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'VENDOR', 'COURIER', 'ADMIN');

-- CreateEnum
CREATE TYPE "IdVerificationStatus" AS ENUM ('UNSUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('draft', 'pending_approval', 'active');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('PRODUCT', 'REAL_ESTATE', 'VEHICLE', 'EVENT', 'SERVICE', 'RESTAURANT', 'PLACE', 'TICKET', 'DIGITAL', 'BOOKABLE');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'ABANDONED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "MainOrderStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PAID', 'AWAITING_VENDOR_FULFILLMENT', 'PARTIALLY_IN_HOUSE', 'READY_TO_BUNDLE', 'AWAITING_SHIPPING', 'SHIPPED', 'CUSTOMER_RECEIVED', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SplitOrderStatus" AS ENUM ('PENDING_PREPARATION', 'PICKUP_REQUESTED', 'COMING_TO_WAREHOUSE', 'PARTIALLY_CHECKED', 'IN_HOUSE', 'READY_FOR_BUNDLE', 'BUNDLED', 'SHIPPED', 'CUSTOMER_RECEIVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WarehouseLineStatus" AS ENUM ('OUTSIDE', 'CHECKED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VendorInboundMethod" AS ENUM ('PICKUP_REQUESTED', 'VENDOR_DROPOFF');

-- CreateEnum
CREATE TYPE "ProductSubtype" AS ENUM ('SIMPLE', 'VARIABLE', 'DIGITAL', 'BOOKABLE', 'TICKET');

-- CreateEnum
CREATE TYPE "ShippingBundleStatus" AS ENUM ('OPEN', 'BUNDLING', 'BUNDLED', 'RELEASED_FOR_SHIPPING', 'SHIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VendorLedgerEntryType" AS ENUM ('CREDIT_ORDER_SETTLEMENT', 'DEBIT_PAYOUT', 'DEBIT_REFUND', 'DEBIT_PLATFORM_FEE', 'CREDIT_ADJUSTMENT', 'DEBIT_ADJUSTMENT', 'CREDIT_REVERSAL');

-- CreateEnum
CREATE TYPE "OrderDocumentType" AS ENUM ('INVOICE', 'RECEIPT', 'PACKING_SLIP', 'TAX_SUMMARY', 'CREDIT_NOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "AIChatSessionType" AS ENUM ('CUSTOMER_SHOPPING', 'VENDOR_LISTING', 'SUPPORT', 'ADMIN');

-- CreateEnum
CREATE TYPE "AIMessageRole" AS ENUM ('SYSTEM', 'USER', 'ASSISTANT', 'TOOL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT,
    "full_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "region" TEXT,
    "id_document_url" TEXT,
    "id_verification_status" "IdVerificationStatus" NOT NULL DEFAULT 'UNSUBMITTED',
    "courier_onboarding_step" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "tagline" TEXT,
    "logo_url" TEXT,
    "status" "StoreStatus" NOT NULL DEFAULT 'draft',
    "onboarding_step" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_thresholds" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "minimum_amount_minor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_ledger_entries" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "entry_type" "VendorLedgerEntryType" NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "balance_after_minor" BIGINT,
    "main_order_id" TEXT,
    "split_order_id" TEXT,
    "payout_request_id" TEXT,
    "idempotency_key" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "label" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "postal_code" TEXT,
    "country" CHAR(2) NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "type" "ListingType" NOT NULL DEFAULT 'PRODUCT',
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image_url" TEXT,
    "short_description" TEXT,
    "description" TEXT,
    "price_minor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "subtype" "ProductSubtype" NOT NULL DEFAULT 'SIMPLE',
    "sku" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "price_minor" INTEGER,
    "attributes" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_real_estate" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "property_type" TEXT NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" DECIMAL(4,1),
    "area_sq_m" DECIMAL(12,2),
    "year_built" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "listing_real_estate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_vehicles" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "vin" TEXT,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "mileage" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "listing_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_events" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "venue_name" TEXT,
    "venue_address" TEXT,
    "capacity" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "listing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_services" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "duration_minutes" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "listing_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_restaurants" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "cuisine" TEXT,
    "hours_json" JSONB,
    "metadata" JSONB,

    CONSTRAINT "listing_restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_places" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "place_type" TEXT,
    "metadata" JSONB,

    CONSTRAINT "listing_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_tickets" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "event_starts_at" TIMESTAMP(3),
    "venue_name" TEXT,
    "section" TEXT,
    "transferable" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,

    CONSTRAINT "listing_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_digitals" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "delivery_channel" TEXT,
    "license_terms" TEXT,
    "metadata" JSONB,

    CONSTRAINT "listing_digitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_bookables" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "slot_minutes" INTEGER,
    "max_party_size" INTEGER,
    "timezone" TEXT,
    "metadata" JSONB,

    CONSTRAINT "listing_bookables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "store_id" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_inventory" (
    "id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "product_variant_id" TEXT NOT NULL,
    "quantity_on_hand" INTEGER NOT NULL DEFAULT 0,
    "quantity_reserved" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "product_variant_id" TEXT,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main_orders" (
    "id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "status" "MainOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "region" TEXT NOT NULL,
    "shipping_zone" TEXT NOT NULL,
    "subtotal_minor" INTEGER NOT NULL,
    "shipping_minor" INTEGER NOT NULL,
    "total_minor" INTEGER NOT NULL,
    "shipping_address_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "main_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "main_order_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "title_snapshot" TEXT NOT NULL,
    "price_minor" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "weight_lbs" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_bundles" (
    "id" TEXT NOT NULL,
    "main_order_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "status" "ShippingBundleStatus" NOT NULL DEFAULT 'OPEN',
    "bundled_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "split_orders" (
    "id" TEXT NOT NULL,
    "main_order_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "status" "SplitOrderStatus" NOT NULL DEFAULT 'PENDING_PREPARATION',
    "subtotal_minor" INTEGER NOT NULL,
    "vendor_net_minor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "vendor_inbound_method" "VendorInboundMethod",
    "pickup_requested_at" TIMESTAMP(3),
    "vendor_dropoff_scheduled_at" TIMESTAMP(3),
    "vendor_dropoff_completed_at" TIMESTAMP(3),
    "customer_marked_received_at" TIMESTAMP(3),
    "shipping_bundle_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "split_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "split_order_items" (
    "id" TEXT NOT NULL,
    "split_order_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "product_variant_id" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price_minor" INTEGER NOT NULL,
    "line_total_minor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "title_snapshot" TEXT NOT NULL,
    "metadata_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "split_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_order_lines" (
    "id" TEXT NOT NULL,
    "split_order_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "status" "WarehouseLineStatus" NOT NULL DEFAULT 'OUTSIDE',
    "quantity_expected" INTEGER NOT NULL,
    "quantity_checked" INTEGER NOT NULL DEFAULT 0,
    "checked_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "split_order_id" TEXT,
    "shipping_bundle_id" TEXT,
    "courier_id" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "tracking_number" TEXT,
    "carrier" TEXT,
    "proof_url" TEXT,
    "estimated_delivery_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_documents" (
    "id" TEXT NOT NULL,
    "main_order_id" TEXT,
    "split_order_id" TEXT,
    "document_type" "OrderDocumentType" NOT NULL,
    "storage_key" TEXT,
    "public_url" TEXT,
    "external_reference" TEXT,
    "mime_type" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "order_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_requests" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "beneficiary_id" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "external_ref" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "main_order_id" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "is_verified_purchase" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_chat_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "AIChatSessionType" NOT NULL,
    "title" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" "AIMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "token_prompt" INTEGER,
    "token_completion" INTEGER,
    "model" TEXT,
    "tool_calls" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "stores_owner_id_key" ON "stores"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "stores_slug_key" ON "stores"("slug");

-- CreateIndex
CREATE INDEX "stores_slug_idx" ON "stores"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_thresholds_store_id_key" ON "vendor_thresholds"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_ledger_entries_idempotency_key_key" ON "vendor_ledger_entries"("idempotency_key");

-- CreateIndex
CREATE INDEX "vendor_ledger_entries_store_id_created_at_idx" ON "vendor_ledger_entries"("store_id", "created_at");

-- CreateIndex
CREATE INDEX "vendor_ledger_entries_split_order_id_idx" ON "vendor_ledger_entries"("split_order_id");

-- CreateIndex
CREATE INDEX "vendor_ledger_entries_payout_request_id_idx" ON "vendor_ledger_entries"("payout_request_id");

-- CreateIndex
CREATE INDEX "addresses_user_id_idx" ON "addresses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "listings_slug_key" ON "listings"("slug");

-- CreateIndex
CREATE INDEX "listings_store_id_status_idx" ON "listings"("store_id", "status");

-- CreateIndex
CREATE INDEX "listings_owner_id_idx" ON "listings"("owner_id");

-- CreateIndex
CREATE INDEX "listings_type_status_idx" ON "listings"("type", "status");

-- CreateIndex
CREATE INDEX "listings_published_at_idx" ON "listings"("published_at");

-- CreateIndex
CREATE UNIQUE INDEX "products_listing_id_key" ON "products"("listing_id");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_real_estate_listing_id_key" ON "listing_real_estate"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_vehicles_listing_id_key" ON "listing_vehicles"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_vehicles_vin_key" ON "listing_vehicles"("vin");

-- CreateIndex
CREATE INDEX "listing_vehicles_make_model_idx" ON "listing_vehicles"("make", "model");

-- CreateIndex
CREATE UNIQUE INDEX "listing_events_listing_id_key" ON "listing_events"("listing_id");

-- CreateIndex
CREATE INDEX "listing_events_starts_at_idx" ON "listing_events"("starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "listing_services_listing_id_key" ON "listing_services"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_restaurants_listing_id_key" ON "listing_restaurants"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_places_listing_id_key" ON "listing_places"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_tickets_listing_id_key" ON "listing_tickets"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_digitals_listing_id_key" ON "listing_digitals"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_bookables_listing_id_key" ON "listing_bookables"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE INDEX "warehouses_store_id_idx" ON "warehouses"("store_id");

-- CreateIndex
CREATE INDEX "warehouse_inventory_product_variant_id_idx" ON "warehouse_inventory"("product_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_inventory_warehouse_id_product_variant_id_key" ON "warehouse_inventory"("warehouse_id", "product_variant_id");

-- CreateIndex
CREATE INDEX "carts_user_id_status_idx" ON "carts"("user_id", "status");

-- CreateIndex
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items"("cart_id");

-- CreateIndex
CREATE INDEX "cart_items_product_variant_id_idx" ON "cart_items"("product_variant_id");

-- CreateIndex
CREATE INDEX "main_orders_buyer_id_status_idx" ON "main_orders"("buyer_id", "status");

-- CreateIndex
CREATE INDEX "main_orders_status_created_at_idx" ON "main_orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "order_items_main_order_id_idx" ON "order_items"("main_order_id");

-- CreateIndex
CREATE INDEX "order_items_listing_id_idx" ON "order_items"("listing_id");

-- CreateIndex
CREATE INDEX "order_items_store_id_idx" ON "order_items"("store_id");

-- CreateIndex
CREATE INDEX "shipping_bundles_main_order_id_status_idx" ON "shipping_bundles"("main_order_id", "status");

-- CreateIndex
CREATE INDEX "shipping_bundles_warehouse_id_idx" ON "shipping_bundles"("warehouse_id");

-- CreateIndex
CREATE INDEX "split_orders_main_order_id_idx" ON "split_orders"("main_order_id");

-- CreateIndex
CREATE INDEX "split_orders_store_id_status_idx" ON "split_orders"("store_id", "status");

-- CreateIndex
CREATE INDEX "split_orders_shipping_bundle_id_idx" ON "split_orders"("shipping_bundle_id");

-- CreateIndex
CREATE INDEX "split_order_items_split_order_id_idx" ON "split_order_items"("split_order_id");

-- CreateIndex
CREATE INDEX "split_order_items_listing_id_idx" ON "split_order_items"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_order_lines_order_item_id_key" ON "warehouse_order_lines"("order_item_id");

-- CreateIndex
CREATE INDEX "warehouse_order_lines_warehouse_id_status_idx" ON "warehouse_order_lines"("warehouse_id", "status");

-- CreateIndex
CREATE INDEX "warehouse_order_lines_split_order_id_idx" ON "warehouse_order_lines"("split_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipping_bundle_id_key" ON "shipments"("shipping_bundle_id");

-- CreateIndex
CREATE INDEX "shipments_split_order_id_idx" ON "shipments"("split_order_id");

-- CreateIndex
CREATE INDEX "shipments_courier_id_status_idx" ON "shipments"("courier_id", "status");

-- CreateIndex
CREATE INDEX "shipments_status_created_at_idx" ON "shipments"("status", "created_at");

-- CreateIndex
CREATE INDEX "order_documents_main_order_id_idx" ON "order_documents"("main_order_id");

-- CreateIndex
CREATE INDEX "order_documents_split_order_id_idx" ON "order_documents"("split_order_id");

-- CreateIndex
CREATE INDEX "order_documents_document_type_generated_at_idx" ON "order_documents"("document_type", "generated_at");

-- CreateIndex
CREATE UNIQUE INDEX "payout_requests_external_ref_key" ON "payout_requests"("external_ref");

-- CreateIndex
CREATE INDEX "payout_requests_store_id_status_idx" ON "payout_requests"("store_id", "status");

-- CreateIndex
CREATE INDEX "payout_requests_status_requested_at_idx" ON "payout_requests"("status", "requested_at");

-- CreateIndex
CREATE INDEX "reviews_listing_id_idx" ON "reviews"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_user_id_listing_id_key" ON "reviews"("user_id", "listing_id");

-- CreateIndex
CREATE INDEX "ai_chat_sessions_user_id_type_idx" ON "ai_chat_sessions"("user_id", "type");

-- CreateIndex
CREATE INDEX "ai_chat_sessions_updated_at_idx" ON "ai_chat_sessions"("updated_at");

-- CreateIndex
CREATE INDEX "ai_messages_session_id_created_at_idx" ON "ai_messages"("session_id", "created_at");

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_thresholds" ADD CONSTRAINT "vendor_thresholds_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_ledger_entries" ADD CONSTRAINT "vendor_ledger_entries_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_ledger_entries" ADD CONSTRAINT "vendor_ledger_entries_main_order_id_fkey" FOREIGN KEY ("main_order_id") REFERENCES "main_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_ledger_entries" ADD CONSTRAINT "vendor_ledger_entries_payout_request_id_fkey" FOREIGN KEY ("payout_request_id") REFERENCES "payout_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_ledger_entries" ADD CONSTRAINT "vendor_ledger_entries_split_order_id_fkey" FOREIGN KEY ("split_order_id") REFERENCES "split_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_ledger_entries" ADD CONSTRAINT "vendor_ledger_entries_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_real_estate" ADD CONSTRAINT "listing_real_estate_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_vehicles" ADD CONSTRAINT "listing_vehicles_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_events" ADD CONSTRAINT "listing_events_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_services" ADD CONSTRAINT "listing_services_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_restaurants" ADD CONSTRAINT "listing_restaurants_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_places" ADD CONSTRAINT "listing_places_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_tickets" ADD CONSTRAINT "listing_tickets_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_digitals" ADD CONSTRAINT "listing_digitals_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_bookables" ADD CONSTRAINT "listing_bookables_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_inventory" ADD CONSTRAINT "warehouse_inventory_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_inventory" ADD CONSTRAINT "warehouse_inventory_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_orders" ADD CONSTRAINT "main_orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_orders" ADD CONSTRAINT "main_orders_shipping_address_id_fkey" FOREIGN KEY ("shipping_address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_main_order_id_fkey" FOREIGN KEY ("main_order_id") REFERENCES "main_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_bundles" ADD CONSTRAINT "shipping_bundles_main_order_id_fkey" FOREIGN KEY ("main_order_id") REFERENCES "main_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_bundles" ADD CONSTRAINT "shipping_bundles_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "split_orders" ADD CONSTRAINT "split_orders_main_order_id_fkey" FOREIGN KEY ("main_order_id") REFERENCES "main_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "split_orders" ADD CONSTRAINT "split_orders_shipping_bundle_id_fkey" FOREIGN KEY ("shipping_bundle_id") REFERENCES "shipping_bundles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "split_orders" ADD CONSTRAINT "split_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "split_order_items" ADD CONSTRAINT "split_order_items_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "split_order_items" ADD CONSTRAINT "split_order_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "split_order_items" ADD CONSTRAINT "split_order_items_split_order_id_fkey" FOREIGN KEY ("split_order_id") REFERENCES "split_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_order_lines" ADD CONSTRAINT "warehouse_order_lines_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "split_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_order_lines" ADD CONSTRAINT "warehouse_order_lines_split_order_id_fkey" FOREIGN KEY ("split_order_id") REFERENCES "split_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_order_lines" ADD CONSTRAINT "warehouse_order_lines_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_shipping_bundle_id_fkey" FOREIGN KEY ("shipping_bundle_id") REFERENCES "shipping_bundles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_split_order_id_fkey" FOREIGN KEY ("split_order_id") REFERENCES "split_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_documents" ADD CONSTRAINT "order_documents_main_order_id_fkey" FOREIGN KEY ("main_order_id") REFERENCES "main_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_documents" ADD CONSTRAINT "order_documents_split_order_id_fkey" FOREIGN KEY ("split_order_id") REFERENCES "split_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_main_order_id_fkey" FOREIGN KEY ("main_order_id") REFERENCES "main_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ai_chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
