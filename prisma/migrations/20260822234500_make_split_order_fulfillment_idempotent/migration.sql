CREATE UNIQUE INDEX "split_orders_main_order_id_store_id_key"
ON "split_orders"("main_order_id", "store_id");
