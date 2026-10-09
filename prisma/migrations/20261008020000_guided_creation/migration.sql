CREATE TABLE "GuidedCreationPlan" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "answers" JSONB NOT NULL,
  "checked" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "version" INTEGER NOT NULL DEFAULT 1,
  "guideVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuidedCreationPlan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GuidedCreationPlan_storeId_createdAt_id_idx" ON "GuidedCreationPlan"("storeId", "createdAt", "id");
ALTER TABLE "GuidedCreationPlan" ADD CONSTRAINT "GuidedCreationPlan_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
