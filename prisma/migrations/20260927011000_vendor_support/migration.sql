CREATE TABLE "VendorSupportTicket" (
 "id" TEXT NOT NULL, "storeId" TEXT NOT NULL, "subject" TEXT NOT NULL, "category" TEXT NOT NULL,
 "priority" TEXT NOT NULL DEFAULT 'NORMAL', "status" TEXT NOT NULL DEFAULT 'OPEN', "reference" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "VendorSupportTicket_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "VendorSupportTicket_status_check" CHECK ("status" IN ('OPEN','IN_PROGRESS','WAITING_VENDOR','RESOLVED')),
 CONSTRAINT "VendorSupportTicket_priority_check" CHECK ("priority" IN ('NORMAL','HIGH'))
);
CREATE INDEX "VendorSupportTicket_storeId_updatedAt_idx" ON "VendorSupportTicket"("storeId", "updatedAt");
CREATE INDEX "VendorSupportTicket_status_updatedAt_idx" ON "VendorSupportTicket"("status", "updatedAt");
CREATE TABLE "VendorSupportMessage" (
 "id" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "authorId" TEXT NOT NULL, "authorRole" TEXT NOT NULL,
 "body" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "VendorSupportMessage_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "VendorSupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "VendorSupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "VendorSupportMessage_ticketId_createdAt_idx" ON "VendorSupportMessage"("ticketId", "createdAt");
