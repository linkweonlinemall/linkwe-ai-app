ALTER TABLE "ticket_orders"
ADD COLUMN "promo_code_id" TEXT,
ADD COLUMN "promo_reservation_expires_at" TIMESTAMP(3);

ALTER TABLE "ticket_orders"
ADD CONSTRAINT "ticket_orders_promo_code_id_fkey"
FOREIGN KEY ("promo_code_id") REFERENCES "event_promo_codes"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ticket_orders_promo_code_id_status_promo_reservation_expires_at_idx"
ON "ticket_orders"("promo_code_id", "status", "promo_reservation_expires_at");
