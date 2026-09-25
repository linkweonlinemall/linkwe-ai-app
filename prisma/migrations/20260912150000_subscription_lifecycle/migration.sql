ALTER TYPE "CustomerSubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

ALTER TABLE "customer_service_subscriptions"
ADD COLUMN "sessions_included" INTEGER,
ADD COLUMN "sessions_remaining" INTEGER,
ADD COLUMN "cancellation_notice_days" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "can_pause" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pause_max_weeks" INTEGER,
ADD COLUMN "pause_used_seconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "paused_at" TIMESTAMP(3),
ADD COLUMN "pause_ends_at" TIMESTAMP(3),
ADD COLUMN "trial_started_at" TIMESTAMP(3),
ADD COLUMN "trial_ends_at" TIMESTAMP(3);

UPDATE "customer_service_subscriptions" AS subscription
SET
  "sessions_included" = product."sessionsIncluded",
  "sessions_remaining" = product."sessionsIncluded",
  "cancellation_notice_days" = GREATEST(COALESCE(product."subscriptionCancellationDays", 0), 0),
  "can_pause" = product."subscriptionCanPause" AND COALESCE(product."subscriptionPauseMaxWeeks", 0) > 0,
  "pause_max_weeks" = CASE
    WHEN product."subscriptionCanPause" AND COALESCE(product."subscriptionPauseMaxWeeks", 0) > 0
      THEN product."subscriptionPauseMaxWeeks"
    ELSE NULL
  END
FROM "Product" AS product
WHERE product."id" = subscription."product_id";

CREATE INDEX "customer_service_subscriptions_status_pause_ends_at_idx"
ON "customer_service_subscriptions"("status", "pause_ends_at");

CREATE INDEX "customer_service_subscriptions_status_current_period_end_idx"
ON "customer_service_subscriptions"("status", "current_period_end");

CREATE TABLE "service_subscription_session_usages" (
  "id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "recorded_by_id" TEXT NOT NULL,
  "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_subscription_session_usages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_subscription_session_usages_subscription_id_used_at_idx"
ON "service_subscription_session_usages"("subscription_id", "used_at");

ALTER TABLE "service_subscription_session_usages"
ADD CONSTRAINT "service_subscription_session_usages_subscription_id_fkey"
FOREIGN KEY ("subscription_id") REFERENCES "customer_service_subscriptions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
