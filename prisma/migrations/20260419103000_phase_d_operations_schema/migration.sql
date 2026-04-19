-- Phase D operations: MainOrderStatus / SplitOrderStatus replacements, Shipment + ledger fields,
-- ShipmentType / LedgerEntryType enums, ShipmentStatus extensions.

-- -----------------------------------------------------------------------------
-- MainOrderStatus: new type + data migration + swap
-- -----------------------------------------------------------------------------
CREATE TYPE "MainOrderStatus_new" AS ENUM (
  'DRAFT',
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'PARTIALLY_IN_HOUSE',
  'READY_TO_SHIP',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED'
);

ALTER TABLE "main_orders" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "main_orders"
  ALTER COLUMN "status" TYPE "MainOrderStatus_new"
  USING (
    CASE "status"::text
      WHEN 'AWAITING_VENDOR_FULFILLMENT' THEN 'PROCESSING'::"MainOrderStatus_new"
      WHEN 'READY_TO_BUNDLE' THEN 'PROCESSING'::"MainOrderStatus_new"
      WHEN 'AWAITING_SHIPPING' THEN 'PROCESSING'::"MainOrderStatus_new"
      WHEN 'CUSTOMER_RECEIVED' THEN 'DELIVERED'::"MainOrderStatus_new"
      ELSE "status"::text::"MainOrderStatus_new"
    END
  );

ALTER TABLE "main_orders"
  ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT'::"MainOrderStatus_new";

DROP TYPE "MainOrderStatus";
ALTER TYPE "MainOrderStatus_new" RENAME TO "MainOrderStatus";

-- -----------------------------------------------------------------------------
-- SplitOrderStatus: new type + data migration + swap
-- -----------------------------------------------------------------------------
CREATE TYPE "SplitOrderStatus_new" AS ENUM (
  'AWAITING_VENDOR_ACTION',
  'VENDOR_PREPARING',
  'AWAITING_COURIER_PICKUP',
  'COURIER_ASSIGNED',
  'COURIER_PICKED_UP',
  'VENDOR_DROPPED_OFF',
  'AT_WAREHOUSE',
  'BUNDLED_FOR_DISPATCH',
  'DISPATCHED',
  'DELIVERED',
  'CANCELLED'
);

ALTER TABLE "split_orders" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "split_orders"
  ALTER COLUMN "status" TYPE "SplitOrderStatus_new"
  USING (
    CASE "status"::text
      WHEN 'PENDING_PREPARATION' THEN 'AWAITING_VENDOR_ACTION'::"SplitOrderStatus_new"
      WHEN 'PICKUP_REQUESTED' THEN 'AWAITING_COURIER_PICKUP'::"SplitOrderStatus_new"
      WHEN 'COMING_TO_WAREHOUSE' THEN 'VENDOR_PREPARING'::"SplitOrderStatus_new"
      WHEN 'PARTIALLY_CHECKED' THEN 'AT_WAREHOUSE'::"SplitOrderStatus_new"
      WHEN 'IN_HOUSE' THEN 'AT_WAREHOUSE'::"SplitOrderStatus_new"
      WHEN 'READY_FOR_BUNDLE' THEN 'BUNDLED_FOR_DISPATCH'::"SplitOrderStatus_new"
      WHEN 'BUNDLED' THEN 'BUNDLED_FOR_DISPATCH'::"SplitOrderStatus_new"
      WHEN 'SHIPPED' THEN 'DISPATCHED'::"SplitOrderStatus_new"
      WHEN 'CUSTOMER_RECEIVED' THEN 'DELIVERED'::"SplitOrderStatus_new"
      WHEN 'COMPLETED' THEN 'DELIVERED'::"SplitOrderStatus_new"
      WHEN 'CANCELLED' THEN 'CANCELLED'::"SplitOrderStatus_new"
      ELSE 'AWAITING_VENDOR_ACTION'::"SplitOrderStatus_new"
    END
  );

ALTER TABLE "split_orders"
  ALTER COLUMN "status" SET DEFAULT 'AWAITING_VENDOR_ACTION'::"SplitOrderStatus_new";

DROP TYPE "SplitOrderStatus";
ALTER TYPE "SplitOrderStatus_new" RENAME TO "SplitOrderStatus";

-- -----------------------------------------------------------------------------
-- SplitOrder: Phase D columns (before shipment FK changes)
-- -----------------------------------------------------------------------------
ALTER TABLE "split_orders" ADD COLUMN IF NOT EXISTS "vendor_action_at" TIMESTAMP(3);
ALTER TABLE "split_orders" ADD COLUMN IF NOT EXISTS "warehouse_received_at" TIMESTAMP(3);
ALTER TABLE "split_orders" ADD COLUMN IF NOT EXISTS "pickup_region" TEXT;
ALTER TABLE "split_orders" ADD COLUMN IF NOT EXISTS "pickup_address" TEXT;

-- -----------------------------------------------------------------------------
-- ShipmentStatus: add operational values (append order matters in PG < 15 for some ops)
-- -----------------------------------------------------------------------------
ALTER TYPE "ShipmentStatus" ADD VALUE 'AWAITING_COURIER_CLAIM';
ALTER TYPE "ShipmentStatus" ADD VALUE 'COURIER_ASSIGNED';
ALTER TYPE "ShipmentStatus" ADD VALUE 'COURIER_PICKED_UP';
ALTER TYPE "ShipmentStatus" ADD VALUE 'DELIVERED_TO_WAREHOUSE';
ALTER TYPE "ShipmentStatus" ADD VALUE 'DELIVERED_TO_CUSTOMER';

-- -----------------------------------------------------------------------------
-- New enums: ShipmentType, LedgerEntryType
-- -----------------------------------------------------------------------------
CREATE TYPE "ShipmentType" AS ENUM ('INBOUND_COURIER_PICKUP', 'OUTBOUND_DELIVERY');

CREATE TYPE "LedgerEntryType" AS ENUM (
  'ORDER_REVENUE',
  'COURIER_PICKUP_FEE',
  'PLATFORM_COMMISSION',
  'PAYOUT',
  'ADJUSTMENT'
);

-- -----------------------------------------------------------------------------
-- VendorLedgerEntry: Phase D columns (amount_minor stays Int)
-- -----------------------------------------------------------------------------
ALTER TABLE "vendor_ledger_entries" ADD COLUMN "ledger_entry_type" "LedgerEntryType";
ALTER TABLE "vendor_ledger_entries" ADD COLUMN "split_order_ref" TEXT;

-- -----------------------------------------------------------------------------
-- Shipment: inbound link + operational fields + named outbound relation (FK columns)
-- -----------------------------------------------------------------------------
ALTER TABLE "shipments" ADD COLUMN "inbound_for_split_order_id" TEXT;
ALTER TABLE "shipments" ADD COLUMN "shipment_status" "ShipmentStatus";
ALTER TABLE "shipments" ADD COLUMN "type" "ShipmentType" NOT NULL DEFAULT 'OUTBOUND_DELIVERY';
ALTER TABLE "shipments" ADD COLUMN "region" TEXT;
ALTER TABLE "shipments" ADD COLUMN "claimed_at" TIMESTAMP(3);
ALTER TABLE "shipments" ADD COLUMN "picked_up_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "shipments_inbound_for_split_order_id_key" ON "shipments"("inbound_for_split_order_id");

ALTER TABLE "shipments"
  ADD CONSTRAINT "shipments_inbound_for_split_order_id_fkey"
  FOREIGN KEY ("inbound_for_split_order_id") REFERENCES "split_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
