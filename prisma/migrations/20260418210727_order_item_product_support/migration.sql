-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_listing_id_fkey";

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "product_id" TEXT,
ALTER COLUMN "listing_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
