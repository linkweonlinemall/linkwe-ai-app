-- AlterTable
ALTER TABLE "payment_attempts" ADD COLUMN     "payment_environment" TEXT;

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "entity_id" TEXT,
    "label" TEXT,
    "value" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "medium" TEXT NOT NULL,
    "campaign" TEXT,
    "device" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_checkouts" (
    "merchant_order_id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "medium" TEXT NOT NULL,
    "campaign" TEXT,
    "device" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_checkouts_pkey" PRIMARY KEY ("merchant_order_id")
);

-- CreateTable
CREATE TABLE "analytics_collection" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_collection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_events_created_at_name_idx" ON "analytics_events"("created_at", "name");

-- CreateIndex
CREATE INDEX "analytics_events_session_id_created_at_idx" ON "analytics_events"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_visitor_id_created_at_idx" ON "analytics_events"("visitor_id", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_source_device_created_at_idx" ON "analytics_events"("source", "device", "created_at");

-- CreateIndex
CREATE INDEX "analytics_checkouts_created_at_idx" ON "analytics_checkouts"("created_at");

-- CreateIndex
CREATE INDEX "analytics_checkouts_session_id_idx" ON "analytics_checkouts"("session_id");
