-- AlterTable
ALTER TABLE "split_orders" ADD COLUMN     "bay_number" INTEGER;

-- CreateTable
CREATE TABLE "dock_bays" (
    "id" TEXT NOT NULL,
    "bayNumber" INTEGER NOT NULL,
    "is_occupied" BOOLEAN NOT NULL DEFAULT false,
    "split_order_id" TEXT,
    "assigned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dock_bays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dock_bays_bayNumber_key" ON "dock_bays"("bayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "dock_bays_split_order_id_key" ON "dock_bays"("split_order_id");

-- AddForeignKey
ALTER TABLE "dock_bays" ADD CONSTRAINT "dock_bays_split_order_id_fkey" FOREIGN KEY ("split_order_id") REFERENCES "split_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
