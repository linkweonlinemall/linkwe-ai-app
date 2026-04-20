-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CHEQUING', 'SAVINGS');

-- CreateEnum
CREATE TYPE "CourierEntryType" AS ENUM ('PICKUP_EARNING', 'PAYOUT', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "VendorBankDetails" ADD COLUMN     "account_type" "AccountType";

-- CreateTable
CREATE TABLE "courier_bank_details" (
    "id" TEXT NOT NULL,
    "courier_id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_type" "AccountType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_ledger_entries" (
    "id" TEXT NOT NULL,
    "courier_id" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TTD',
    "entry_type" "CourierEntryType" NOT NULL,
    "shipment_id" TEXT,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_payout_requests" (
    "id" TEXT NOT NULL,
    "courier_id" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TTD',
    "status" "PayoutStatus" NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "notes" TEXT,

    CONSTRAINT "courier_payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courier_bank_details_courier_id_key" ON "courier_bank_details"("courier_id");

-- CreateIndex
CREATE INDEX "courier_ledger_entries_courier_id_idx" ON "courier_ledger_entries"("courier_id");

-- CreateIndex
CREATE INDEX "courier_payout_requests_status_idx" ON "courier_payout_requests"("status");

-- AddForeignKey
ALTER TABLE "courier_bank_details" ADD CONSTRAINT "courier_bank_details_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_ledger_entries" ADD CONSTRAINT "courier_ledger_entries_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_payout_requests" ADD CONSTRAINT "courier_payout_requests_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
