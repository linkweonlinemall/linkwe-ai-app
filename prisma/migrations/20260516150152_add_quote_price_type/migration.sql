-- CreateEnum
CREATE TYPE "QuotePriceType" AS ENUM ('STARTING_FROM', 'CALLOUT_FEE', 'FREE_QUOTE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "quotePriceType" "QuotePriceType",
ALTER COLUMN "price" SET DEFAULT 0;
