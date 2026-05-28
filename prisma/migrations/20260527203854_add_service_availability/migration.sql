-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "availableDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "availableFrom" TEXT,
ADD COLUMN     "availableTo" TEXT,
ADD COLUMN     "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "durationMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxPerDay" INTEGER,
ADD COLUMN     "useStoreHours" BOOLEAN NOT NULL DEFAULT true;
