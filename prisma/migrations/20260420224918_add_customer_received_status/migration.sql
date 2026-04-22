-- AlterEnum
ALTER TYPE "MainOrderStatus" ADD VALUE 'CUSTOMER_RECEIVED';

-- AlterTable
ALTER TABLE "main_orders" ADD COLUMN     "received_at" TIMESTAMP(3);
