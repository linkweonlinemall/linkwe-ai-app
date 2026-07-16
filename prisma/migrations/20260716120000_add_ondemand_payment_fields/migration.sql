-- AlterTable
ALTER TABLE "on_demand_requests" ADD COLUMN "amount_paid" DOUBLE PRECISION;
ALTER TABLE "on_demand_requests" ADD COLUMN "stripe_payment_intent_id" TEXT;
