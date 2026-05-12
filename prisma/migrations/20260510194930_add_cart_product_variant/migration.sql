-- AlterTable
ALTER TABLE "product_cart_items" ADD COLUMN     "product_variant_id" TEXT;

-- CreateIndex
CREATE INDEX "product_cart_items_product_variant_id_idx" ON "product_cart_items"("product_variant_id");

-- AddForeignKey
ALTER TABLE "product_cart_items" ADD CONSTRAINT "product_cart_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
