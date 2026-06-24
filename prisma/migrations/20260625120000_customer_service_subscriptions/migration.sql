-- AlterEnum
ALTER TYPE "LedgerEntryType" ADD VALUE 'SERVICE_SUBSCRIPTION_RENEWAL';

-- CreateEnum
CREATE TYPE "CustomerSubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" TEXT;

-- CreateTable
CREATE TABLE "customer_service_subscriptions" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT,
    "status" "CustomerSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_period_end" TIMESTAMP(3),
    "price_minor" INTEGER NOT NULL,
    "interval" TEXT NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_service_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_service_subscriptions_customer_id_idx" ON "customer_service_subscriptions"("customer_id");

-- CreateIndex
CREATE INDEX "customer_service_subscriptions_product_id_idx" ON "customer_service_subscriptions"("product_id");

-- CreateIndex
CREATE INDEX "customer_service_subscriptions_store_id_idx" ON "customer_service_subscriptions"("store_id");

-- CreateIndex
CREATE INDEX "customer_service_subscriptions_stripe_subscription_id_idx" ON "customer_service_subscriptions"("stripe_subscription_id");

-- Partial unique: at most one ACTIVE subscription per (customer, product)
CREATE UNIQUE INDEX "customer_service_subscriptions_one_active_per_product" ON "customer_service_subscriptions"("customer_id", "product_id") WHERE "status" = 'ACTIVE';

-- AddForeignKey
ALTER TABLE "customer_service_subscriptions" ADD CONSTRAINT "customer_service_subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_subscriptions" ADD CONSTRAINT "customer_service_subscriptions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_subscriptions" ADD CONSTRAINT "customer_service_subscriptions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
