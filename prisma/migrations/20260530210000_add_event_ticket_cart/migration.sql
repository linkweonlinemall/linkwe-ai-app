-- CreateTable
CREATE TABLE "event_ticket_cart_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ticket_type_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_ticket_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_ticket_cart_items_user_id_idx" ON "event_ticket_cart_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_ticket_cart_items_user_id_ticket_type_id_key" ON "event_ticket_cart_items"("user_id", "ticket_type_id");

-- AddForeignKey
ALTER TABLE "event_ticket_cart_items" ADD CONSTRAINT "event_ticket_cart_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_ticket_cart_items" ADD CONSTRAINT "event_ticket_cart_items_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "EventTicketType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
