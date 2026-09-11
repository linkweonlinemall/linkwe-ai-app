ALTER TABLE "business_posts"
ADD COLUMN "attachments" JSONB NOT NULL DEFAULT '[]'::jsonb;
