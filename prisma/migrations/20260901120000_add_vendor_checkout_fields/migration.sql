ALTER TABLE "stores" ADD COLUMN "checkout_fields" JSONB;
ALTER TABLE "main_orders" ADD COLUMN "checkout_responses" JSONB;
