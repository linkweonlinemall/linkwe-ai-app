-- Run in Neon SQL editor when production Product table lags schema.prisma.
-- Table name is "Product" (Prisma default), not products.
-- Idempotent: safe to run more than once.

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "maxPerDay" INTEGER,
  ADD COLUMN IF NOT EXISTS "useStoreHours" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "availableDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "availableFrom" TEXT,
  ADD COLUMN IF NOT EXISTS "availableTo" TEXT,
  ADD COLUMN IF NOT EXISTS "isAvailable" BOOLEAN NOT NULL DEFAULT true;
