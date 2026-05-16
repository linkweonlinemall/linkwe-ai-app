-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "subscriptionCanPause" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subscriptionPauseMaxWeeks" INTEGER,
ADD COLUMN     "subscriptionTrialPeriod" INTEGER,
ADD COLUMN     "subscriptionTrialPrice" DOUBLE PRECISION;
