-- CreateEnum
CREATE TYPE "VendorSubscriptionPlan" AS ENUM ('STARTER', 'GROWTH', 'PRO');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'DEPOSIT_PAID';
ALTER TYPE "LedgerEntryType" ADD VALUE 'BOOKING_COMPLETE';
ALTER TYPE "LedgerEntryType" ADD VALUE 'BOOKING_AUTO_COMPLETE';
ALTER TYPE "LedgerEntryType" ADD VALUE 'DEPOSIT_RECEIVED';
ALTER TYPE "LedgerEntryType" ADD VALUE 'ORDER_AUTO_COMPLETE';
ALTER TYPE "SplitOrderStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "stores" ADD COLUMN "subscription_plan" "VendorSubscriptionPlan" NOT NULL DEFAULT 'STARTER';

-- AlterTable
ALTER TABLE "ProductBooking" ADD COLUMN     "amount_paid" DOUBLE PRECISION,
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "auto_complete_at" TIMESTAMP(3),
ADD COLUMN     "marked_complete_by" TEXT,
ADD COLUMN     "earnings_released" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "earnings_amount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "split_orders" ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "auto_complete_at" TIMESTAMP(3),
ADD COLUMN     "marked_complete_by" TEXT,
ADD COLUMN     "earnings_released" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "vendor_ledger_entries" ADD COLUMN     "booking_id" TEXT,
ADD COLUMN     "gross_minor" INTEGER,
ADD COLUMN     "commission_minor" INTEGER,
ADD COLUMN     "net_minor" INTEGER,
ADD COLUMN     "released_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ProductBooking_auto_complete_at_earnings_released_idx" ON "ProductBooking"("auto_complete_at", "earnings_released");

-- CreateIndex
CREATE INDEX "vendor_ledger_entries_booking_id_idx" ON "vendor_ledger_entries"("booking_id");

-- AddForeignKey
ALTER TABLE "vendor_ledger_entries" ADD CONSTRAINT "vendor_ledger_entries_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "ProductBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
