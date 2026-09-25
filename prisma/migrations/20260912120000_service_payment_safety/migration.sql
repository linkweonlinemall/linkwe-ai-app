ALTER TYPE "PaymentAttemptStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "PaymentAttemptStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'ON_DEMAND_COMPLETE';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'ON_DEMAND_AUTO_COMPLETE';
ALTER TYPE "OnDemandRequestStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';

ALTER TABLE "payment_attempts"
ADD COLUMN "expires_at" TIMESTAMP(3),
ADD COLUMN "active_key" TEXT;

CREATE UNIQUE INDEX "payment_attempts_active_key_key"
ON "payment_attempts"("active_key");

CREATE INDEX "payment_attempts_status_expires_at_idx"
ON "payment_attempts"("status", "expires_at");

ALTER TABLE "on_demand_requests"
ADD COLUMN "vendor_completed_at" TIMESTAMP(3),
ADD COLUMN "auto_complete_at" TIMESTAMP(3),
ADD COLUMN "marked_complete_by" TEXT,
ADD COLUMN "earnings_released" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "earnings_amount" DOUBLE PRECISION;

UPDATE "on_demand_requests"
SET
  "vendor_completed_at" = "completedAt",
  "marked_complete_by" = 'LEGACY',
  "earnings_released" = true
WHERE "status" = 'COMPLETED';

CREATE INDEX "on_demand_requests_auto_complete_at_earnings_released_idx"
ON "on_demand_requests"("auto_complete_at", "earnings_released");
