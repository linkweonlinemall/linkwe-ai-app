-- CreateTable
CREATE TABLE "product_cart_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_cart_items_user_id_idx" ON "product_cart_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_cart_items_user_id_product_id_key" ON "product_cart_items"("user_id", "product_id");

-- AddForeignKey
ALTER TABLE "product_cart_items" ADD CONSTRAINT "product_cart_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cart_items" ADD CONSTRAINT "product_cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
