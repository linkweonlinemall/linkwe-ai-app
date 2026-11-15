-- Additive only: existing featured catalogues and all product data stay unchanged.
ALTER TABLE "stores"
  ADD COLUMN "catalogue_collections" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "catalogue_revision" INTEGER NOT NULL DEFAULT 0;
