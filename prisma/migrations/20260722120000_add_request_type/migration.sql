-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('ON_DEMAND', 'QUOTE');

-- AlterTable
ALTER TABLE "on_demand_requests" ADD COLUMN "request_type" "RequestType" NOT NULL DEFAULT 'ON_DEMAND';
