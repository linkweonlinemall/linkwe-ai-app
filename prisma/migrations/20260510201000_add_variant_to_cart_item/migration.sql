-- DropIndex
DROP INDEX IF EXISTS "product_cart_items_user_id_product_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "product_cart_items_user_id_product_id_product_variant_id_key" ON "product_cart_items"("user_id", "product_id", "product_variant_id");
