-- AlterTable
ALTER TABLE "VendorChat" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'customer';

-- CreateIndex
CREATE INDEX "VendorChat_userId_type_idx" ON "VendorChat"("userId", "type");
