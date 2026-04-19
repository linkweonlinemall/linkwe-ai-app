-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "deliveryFee" DOUBLE PRECISION,
ADD COLUMN     "deliveryRegions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "shortDescription" TEXT;
