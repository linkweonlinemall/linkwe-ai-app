-- Repoint any legacy PACKAGING rows before enum replacement
UPDATE "split_orders" SET "status" = 'AT_WAREHOUSE' WHERE "status"::text = 'PACKAGING';

-- AlterEnum
BEGIN;
CREATE TYPE "SplitOrderStatus_new" AS ENUM ('AWAITING_VENDOR_ACTION', 'VENDOR_PREPARING', 'AWAITING_COURIER_PICKUP', 'COURIER_ASSIGNED', 'COURIER_PICKED_UP', 'VENDOR_DROPPED_OFF', 'AT_WAREHOUSE', 'PACKAGED', 'BUNDLED_FOR_DISPATCH', 'DISPATCHED', 'DELIVERED', 'CANCELLED');
ALTER TABLE "split_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "split_orders" ALTER COLUMN "status" TYPE "SplitOrderStatus_new" USING ("status"::text::"SplitOrderStatus_new");
ALTER TYPE "SplitOrderStatus" RENAME TO "SplitOrderStatus_old";
ALTER TYPE "SplitOrderStatus_new" RENAME TO "SplitOrderStatus";
DROP TYPE "SplitOrderStatus_old";
ALTER TABLE "split_orders" ALTER COLUMN "status" SET DEFAULT 'AWAITING_VENDOR_ACTION';
COMMIT;

-- AlterTable
ALTER TABLE "split_orders" DROP COLUMN IF EXISTS "packaging_started_at";
