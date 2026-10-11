-- Additive, inventory-only receipt. No financial records or existing stock values change.
CREATE TABLE "stock_adjustments" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "request_id" UUID NOT NULL,
    "request_hash" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'OFFLINE_LIVE',
    "total_quantity" INTEGER NOT NULL CHECK ("total_quantity" > 0),
    "lines" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stock_adjustments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "stock_adjustments_store_id_request_id_key" ON "stock_adjustments"("store_id", "request_id");
CREATE INDEX "stock_adjustments_store_id_created_at_idx" ON "stock_adjustments"("store_id", "created_at");
