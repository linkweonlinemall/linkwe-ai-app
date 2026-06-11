-- CreateTable
CREATE TABLE "ContentLink" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "fromType" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toType" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentLink_fromType_fromId_idx" ON "ContentLink"("fromType", "fromId");

-- CreateIndex
CREATE INDEX "ContentLink_storeId_idx" ON "ContentLink"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentLink_fromType_fromId_toType_toId_key" ON "ContentLink"("fromType", "fromId", "toType", "toId");

-- AddForeignKey
ALTER TABLE "ContentLink" ADD CONSTRAINT "ContentLink_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
