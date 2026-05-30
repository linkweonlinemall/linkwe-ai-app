-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('VALID', 'USED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RefundPolicyType" AS ENUM ('FULL', 'PARTIAL', 'NONE');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "eventType" TEXT NOT NULL DEFAULT 'SINGLE',
ADD COLUMN     "galleryImages" TEXT[],
ADD COLUMN     "hasSeating" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "refundCutoffHours" INTEGER NOT NULL DEFAULT 48,
ADD COLUMN     "refundPolicyType" "RefundPolicyType" NOT NULL DEFAULT 'FULL',
ADD COLUMN     "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "streamUrl" TEXT;

-- AlterTable
ALTER TABLE "EventTicketType" ADD COLUMN     "color" TEXT,
ADD COLUMN     "isVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxPerOrder" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "perks" TEXT,
ADD COLUMN     "saleStartDate" TIMESTAMP(3),
ADD COLUMN     "validDays" JSONB;

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "holderName" TEXT NOT NULL,
    "holderEmail" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'VALID',
    "checkedInAt" TIMESTAMP(3),
    "checkedInBy" TEXT,
    "transferredToId" TEXT,
    "validDays" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_promo_codes" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_waitlist" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticketNumber_key" ON "tickets"("ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_qrToken_key" ON "tickets"("qrToken");

-- CreateIndex
CREATE INDEX "tickets_eventId_idx" ON "tickets"("eventId");

-- CreateIndex
CREATE INDEX "tickets_userId_idx" ON "tickets"("userId");

-- CreateIndex
CREATE INDEX "tickets_qrToken_idx" ON "tickets"("qrToken");

-- CreateIndex
CREATE INDEX "tickets_ticketNumber_idx" ON "tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "event_promo_codes_eventId_idx" ON "event_promo_codes"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_promo_codes_eventId_code_key" ON "event_promo_codes"("eventId", "code");

-- CreateIndex
CREATE INDEX "event_waitlist_eventId_idx" ON "event_waitlist"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_waitlist_eventId_email_key" ON "event_waitlist"("eventId", "email");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "EventTicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_promo_codes" ADD CONSTRAINT "event_promo_codes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_waitlist" ADD CONSTRAINT "event_waitlist_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
