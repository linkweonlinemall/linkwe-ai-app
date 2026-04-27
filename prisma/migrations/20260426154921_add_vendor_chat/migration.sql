-- CreateTable
CREATE TABLE "VendorChat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New conversation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorChatMessage" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorChat_userId_idx" ON "VendorChat"("userId");

-- CreateIndex
CREATE INDEX "VendorChatMessage_chatId_idx" ON "VendorChatMessage"("chatId");

-- AddForeignKey
ALTER TABLE "VendorChat" ADD CONSTRAINT "VendorChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorChatMessage" ADD CONSTRAINT "VendorChatMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "VendorChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
