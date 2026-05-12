-- AlterTable
ALTER TABLE "users" ADD COLUMN     "account_name" TEXT,
ADD COLUMN     "account_number" TEXT,
ADD COLUMN     "bank_name" TEXT,
ADD COLUMN     "id_verified_at" TIMESTAMP(3),
ADD COLUMN     "id_verified_by_id" TEXT;
