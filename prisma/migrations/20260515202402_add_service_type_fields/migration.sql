-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "estimatedResponseMins" INTEGER,
ADD COLUMN     "minimumQuoteAmount" DOUBLE PRECISION,
ADD COLUMN     "responseTime" TEXT,
ADD COLUMN     "serviceRadius" INTEGER,
ADD COLUMN     "sessionsIncluded" INTEGER,
ADD COLUMN     "siteVisitRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subscriptionCancellationDays" INTEGER,
ADD COLUMN     "subscriptionInterval" TEXT,
ADD COLUMN     "travelFee" DOUBLE PRECISION,
ADD COLUMN     "virtualMeetingInfo" TEXT,
ADD COLUMN     "virtualPlatform" TEXT;
