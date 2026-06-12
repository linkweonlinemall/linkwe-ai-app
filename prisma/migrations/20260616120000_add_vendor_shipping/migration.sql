-- CreateEnum
CREATE TYPE "StoreShippingMode" AS ENUM ('SELF', 'LINKWE');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN "shipping_mode" "StoreShippingMode" NOT NULL DEFAULT 'LINKWE';

-- CreateTable
CREATE TABLE "vendor_shipping_rates" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "rate_minor" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_shipping_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendor_shipping_rates_store_id_idx" ON "vendor_shipping_rates"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_shipping_rates_store_id_zone_key" ON "vendor_shipping_rates"("store_id", "zone");

-- AddForeignKey
ALTER TABLE "vendor_shipping_rates" ADD CONSTRAINT "vendor_shipping_rates_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
