ALTER TABLE "business_posts"
ADD COLUMN "search_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "business_posts_search_tags_idx"
ON "business_posts" USING GIN ("search_tags");
