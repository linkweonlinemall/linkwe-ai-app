-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_usage_store_id_idx" ON "ai_usage"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_store_id_period_key_key" ON "ai_usage"("store_id", "period_key");

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
