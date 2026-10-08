CREATE TABLE "StaffAccess" (
  "staffId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "userId" TEXT,
  "inviteTokenHash" TEXT,
  "inviteExpiresAt" TIMESTAMP(3),
  "canEditNotes" BOOLEAN NOT NULL DEFAULT false,
  "canManageTimeOff" BOOLEAN NOT NULL DEFAULT false,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffAccess_pkey" PRIMARY KEY ("staffId")
);
CREATE UNIQUE INDEX "StaffAccess_inviteTokenHash_key" ON "StaffAccess"("inviteTokenHash");
CREATE INDEX "StaffAccess_userId_idx" ON "StaffAccess"("userId");
ALTER TABLE "StaffAccess" ADD CONSTRAINT "StaffAccess_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffAccess" ADD CONSTRAINT "StaffAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
