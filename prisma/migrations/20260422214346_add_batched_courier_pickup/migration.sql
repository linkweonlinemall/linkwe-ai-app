-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "pickup_fee_minor" INTEGER,
ADD COLUMN     "total_weight_lbs" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "split_orders" ADD COLUMN     "inbound_shipment_id" TEXT;

-- AddForeignKey
ALTER TABLE "split_orders" ADD CONSTRAINT "split_orders_inbound_shipment_id_fkey" FOREIGN KEY ("inbound_shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
