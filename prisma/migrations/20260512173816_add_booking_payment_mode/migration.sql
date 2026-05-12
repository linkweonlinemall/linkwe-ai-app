-- CreateEnum
CREATE TYPE "BookingPaymentMode" AS ENUM ('ONLINE_ONLY', 'ON_ARRIVAL_ONLY', 'CUSTOMER_CHOOSES');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "bookingPaymentMode" "BookingPaymentMode" DEFAULT 'CUSTOMER_CHOOSES';
