-- AlterTable
ALTER TABLE "main_orders" ADD COLUMN "reference_number" TEXT;

-- AlterTable
ALTER TABLE "split_orders" ADD COLUMN "reference_number" TEXT;

-- CreateTable
CREATE TABLE "courier_locations" (
    "id" TEXT NOT NULL,
    "courier_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "heading" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courier_locations_courier_id_key" ON "courier_locations"("courier_id");

-- CreateIndex
CREATE INDEX "courier_locations_is_active_idx" ON "courier_locations"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "main_orders_reference_number_key" ON "main_orders"("reference_number");

-- CreateIndex
CREATE INDEX "main_orders_created_at_idx" ON "main_orders"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "split_orders_reference_number_key" ON "split_orders"("reference_number");

-- CreateIndex
CREATE INDEX "split_orders_status_idx" ON "split_orders"("status");

-- AddForeignKey
ALTER TABLE "courier_locations" ADD CONSTRAINT "courier_locations_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
