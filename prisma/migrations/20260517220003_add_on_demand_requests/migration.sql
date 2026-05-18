-- CreateEnum
CREATE TYPE "OnDemandRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "isAvailableNow" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "on_demand_requests" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customerLat" DOUBLE PRECISION,
    "customerLng" DOUBLE PRECISION,
    "customerAddress" TEXT,
    "status" "OnDemandRequestStatus" NOT NULL DEFAULT 'PENDING',
    "vendorNotes" TEXT,
    "quotedPrice" DOUBLE PRECISION,
    "estimatedArrival" TEXT,
    "declineReason" TEXT,
    "respondedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "on_demand_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "on_demand_requests_serviceId_idx" ON "on_demand_requests"("serviceId");

-- CreateIndex
CREATE INDEX "on_demand_requests_customerId_idx" ON "on_demand_requests"("customerId");

-- CreateIndex
CREATE INDEX "on_demand_requests_storeId_idx" ON "on_demand_requests"("storeId");

-- CreateIndex
CREATE INDEX "on_demand_requests_status_idx" ON "on_demand_requests"("status");

-- AddForeignKey
ALTER TABLE "on_demand_requests" ADD CONSTRAINT "on_demand_requests_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "on_demand_requests" ADD CONSTRAINT "on_demand_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "on_demand_requests" ADD CONSTRAINT "on_demand_requests_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
