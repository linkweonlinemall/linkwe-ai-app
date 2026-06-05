-- AlterEnum
ALTER TYPE "LedgerEntryType" ADD VALUE 'TICKET_SALE';

-- AlterTable
ALTER TABLE "ticket_orders" ADD COLUMN "earnings_released" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ticket_orders" ADD COLUMN "payout_eligible_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ticket_orders_payout_eligible_at_earnings_released_idx" ON "ticket_orders"("payout_eligible_at", "earnings_released");
