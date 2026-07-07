-- AlterTable
ALTER TABLE "stores" ADD COLUMN "ai_topup_credits_remaining" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ai_topup_purchases" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "uses_purchased" INTEGER NOT NULL,
    "price_paid_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ttd',
    "stripe_payment_intent_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "ai_topup_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_topup_purchases_stripe_payment_intent_id_key" ON "ai_topup_purchases"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "ai_topup_purchases_store_id_idx" ON "ai_topup_purchases"("store_id");

-- AddForeignKey
ALTER TABLE "ai_topup_purchases" ADD CONSTRAINT "ai_topup_purchases_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
