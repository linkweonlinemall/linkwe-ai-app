-- AlterTable
ALTER TABLE "tickets" ADD COLUMN "refunded_at" TIMESTAMP(3);
ALTER TABLE "tickets" ADD COLUMN "refund_amount_minor" INTEGER;
ALTER TABLE "tickets" ADD COLUMN "stripe_refund_id" TEXT;
