-- CSF Couriers now handles every delivered product order through LinkWe.
-- Existing stores must use the managed flow so fulfillment status and payouts
-- match the checkout price calculation.
UPDATE "stores"
SET "shipping_mode" = 'LINKWE'
WHERE "shipping_mode" <> 'LINKWE';
