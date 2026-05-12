-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('BOOKABLE', 'QUOTE', 'SUBSCRIPTION', 'ON_DEMAND', 'VIRTUAL');

-- CreateEnum
CREATE TYPE "ServiceLocation" AS ENUM ('AT_VENDOR', 'AT_CUSTOMER', 'VIRTUAL', 'FLEXIBLE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "depositAmount" DOUBLE PRECISION,
ADD COLUMN     "isService" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresDeposit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "serviceDuration" INTEGER,
ADD COLUMN     "serviceLocation" "ServiceLocation",
ADD COLUMN     "serviceType" "ServiceType";
