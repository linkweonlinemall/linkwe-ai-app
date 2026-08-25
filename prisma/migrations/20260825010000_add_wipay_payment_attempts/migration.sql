CREATE TYPE "PaymentProvider" AS ENUM ('WIPAY');
CREATE TYPE "PaymentPurpose" AS ENUM ('PRODUCT_ORDER', 'PRODUCT_BOOKING', 'ON_DEMAND_SERVICE', 'TICKET_ORDER', 'AI_TOPUP', 'VENDOR_SUBSCRIPTION', 'SERVICE_SUBSCRIPTION');
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'ERROR', 'REFUND_REQUESTED', 'REFUNDED', 'CHARGEBACK_PENDING', 'CHARGEBACK_PROCESSED', 'CHARGEBACK_RELEASED', 'FRAUD_CONFIRMED');

CREATE TABLE "payment_attempts" (
  "id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'WIPAY',
  "purpose" "PaymentPurpose" NOT NULL,
  "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "merchant_order_id" TEXT NOT NULL,
  "provider_transaction_id" TEXT,
  "amount_minor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TTD',
  "user_id" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "main_order_id" TEXT,
  "trusted_card_id" TEXT,
  "failure_message" TEXT,
  "provider_data" JSONB,
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_attempts_merchant_order_id_key" ON "payment_attempts"("merchant_order_id");
CREATE UNIQUE INDEX "payment_attempts_provider_transaction_id_key" ON "payment_attempts"("provider_transaction_id");
CREATE INDEX "payment_attempts_user_id_status_idx" ON "payment_attempts"("user_id", "status");
CREATE INDEX "payment_attempts_purpose_target_id_idx" ON "payment_attempts"("purpose", "target_id");
CREATE INDEX "payment_attempts_status_created_at_idx" ON "payment_attempts"("status", "created_at");
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_main_order_id_fkey" FOREIGN KEY ("main_order_id") REFERENCES "main_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_topup_purchases" ALTER COLUMN "stripe_payment_intent_id" DROP NOT NULL;

CREATE TYPE "WiPayTrustedCardStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'DELETED');
CREATE TABLE "wipay_trusted_cards" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider_uuid" TEXT NOT NULL,
  "enrollment_transaction_id" TEXT,
  "status" "WiPayTrustedCardStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "card_last_four" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verified_at" TIMESTAMP(3),
  "deleted_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "wipay_trusted_cards_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "wipay_trusted_cards_provider_uuid_key" ON "wipay_trusted_cards"("provider_uuid");
CREATE UNIQUE INDEX "wipay_trusted_cards_enrollment_transaction_id_key" ON "wipay_trusted_cards"("enrollment_transaction_id");
CREATE INDEX "wipay_trusted_cards_user_id_status_idx" ON "wipay_trusted_cards"("user_id", "status");
ALTER TABLE "wipay_trusted_cards" ADD CONSTRAINT "wipay_trusted_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stores" ADD COLUMN "wipay_trusted_card_id" TEXT;
ALTER TABLE "customer_service_subscriptions" ADD COLUMN "wipay_trusted_card_id" TEXT;
ALTER TABLE "customer_service_subscriptions" ADD COLUMN "next_charge_at" TIMESTAMP(3);
ALTER TABLE "customer_service_subscriptions" ADD COLUMN "last_charge_at" TIMESTAMP(3);

CREATE TABLE "wipay_card_enrollments" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider_transaction_id" TEXT,
  "purpose" "PaymentPurpose" NOT NULL,
  "target_id" TEXT NOT NULL,
  "amount_minor" INTEGER NOT NULL,
  "metadata" JSONB,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "wipay_card_enrollments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "wipay_card_enrollments_provider_transaction_id_key" ON "wipay_card_enrollments"("provider_transaction_id");
CREATE INDEX "wipay_card_enrollments_user_id_created_at_idx" ON "wipay_card_enrollments"("user_id", "created_at");
ALTER TABLE "wipay_card_enrollments" ADD CONSTRAINT "wipay_card_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "payment_webhook_events" (
  "id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payment_webhook_events_event_type_received_at_idx" ON "payment_webhook_events"("event_type", "received_at");

ALTER TYPE "TicketOrderStatus" ADD VALUE 'REFUNDED';
