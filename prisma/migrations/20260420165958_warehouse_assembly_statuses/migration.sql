-- AlterEnum
ALTER TYPE "MainOrderStatus" ADD VALUE 'PACKING_COMPLETE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SplitOrderStatus" ADD VALUE 'PACKAGING';
ALTER TYPE "SplitOrderStatus" ADD VALUE 'PACKAGED';

-- AlterTable
ALTER TABLE "split_orders" ADD COLUMN     "packaged_at" TIMESTAMP(3),
ADD COLUMN     "packaging_started_at" TIMESTAMP(3);
