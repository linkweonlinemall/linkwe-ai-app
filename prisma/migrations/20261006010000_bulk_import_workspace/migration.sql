CREATE TABLE "ImportBatch" (
  "id" TEXT NOT NULL, "actorId" TEXT NOT NULL, "kind" TEXT NOT NULL,
  "filename" TEXT NOT NULL, "sheet" TEXT NOT NULL, "headers" JSONB NOT NULL,
  "mapping" JSONB NOT NULL, "storeId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ImportRow" (
  "id" TEXT NOT NULL, "batchId" TEXT NOT NULL, "number" INTEGER NOT NULL,
  "raw" JSONB NOT NULL, "values" JSONB NOT NULL, "errors" JSONB NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'ready', "recordId" TEXT, "createdRecord" BOOLEAN NOT NULL DEFAULT false,
  "createdUserId" TEXT, "recordVersion" TEXT, "version" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT, "invitationSentAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "ImportAsset" (
  "id" TEXT NOT NULL, "batchId" TEXT NOT NULL, "name" TEXT NOT NULL, "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ImportAsset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ImportAsset_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "ImportChange" (
  "id" TEXT NOT NULL, "batchId" TEXT NOT NULL, "rowId" TEXT, "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL, "summary" TEXT NOT NULL, "before" JSONB, "after" JSONB,
  "undone" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportChange_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ImportChange_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ImportChange_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "ImportRow"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "ImportBatch_actorId_createdAt_idx" ON "ImportBatch"("actorId", "createdAt");
CREATE UNIQUE INDEX "ImportRow_batchId_number_key" ON "ImportRow"("batchId", "number");
CREATE INDEX "ImportRow_batchId_state_idx" ON "ImportRow"("batchId", "state");
CREATE INDEX "ImportAsset_batchId_idx" ON "ImportAsset"("batchId");
CREATE INDEX "ImportChange_batchId_createdAt_idx" ON "ImportChange"("batchId", "createdAt");
