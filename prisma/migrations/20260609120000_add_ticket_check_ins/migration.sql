-- CreateTable
CREATE TABLE "ticket_check_ins" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "deviceId" TEXT,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_check_ins_ticketId_idx" ON "ticket_check_ins"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_check_ins_eventId_idx" ON "ticket_check_ins"("eventId");

-- CreateIndex
CREATE INDEX "ticket_check_ins_deviceId_idx" ON "ticket_check_ins"("deviceId");

-- AddForeignKey
ALTER TABLE "ticket_check_ins" ADD CONSTRAINT "ticket_check_ins_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_check_ins" ADD CONSTRAINT "ticket_check_ins_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
