ALTER TABLE "main_orders" ADD COLUMN "couponSnapshot" JSONB;
ALTER TABLE "ProductBooking" ADD COLUMN "couponSnapshot" JSONB;
ALTER TABLE "on_demand_requests" ADD COLUMN "couponSnapshot" JSONB;
ALTER TABLE "ticket_orders" ADD COLUMN "couponSnapshot" JSONB;
CREATE TABLE "store_coupons" (
 "id" TEXT NOT NULL, "storeId" TEXT NOT NULL, "code" TEXT NOT NULL,
 "discountType" TEXT NOT NULL, "discountValue" INTEGER NOT NULL,
 "minimumMinor" INTEGER NOT NULL DEFAULT 0,
 "scopes" TEXT[] DEFAULT ARRAY['product','service','event']::TEXT[],
 "active" BOOLEAN NOT NULL DEFAULT true, "expiresAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "store_coupons_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "store_coupons_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "store_coupons_discount_valid" CHECK (("discountType" = 'PERCENT' AND "discountValue" BETWEEN 1 AND 100) OR ("discountType" = 'FIXED' AND "discountValue" > 0)),
 CONSTRAINT "store_coupons_minimum_valid" CHECK ("minimumMinor" >= 0)
);
CREATE UNIQUE INDEX "store_coupons_storeId_code_key" ON "store_coupons"("storeId","code");
CREATE INDEX "store_coupons_storeId_active_idx" ON "store_coupons"("storeId","active");
