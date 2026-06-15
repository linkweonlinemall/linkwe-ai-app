-- CreateEnum
CREATE TYPE "StoreSubscriptionStatus" AS ENUM ('NONE', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "subscription_status" "StoreSubscriptionStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "plan_renews_at" TIMESTAMP(3),
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT;
