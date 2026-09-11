CREATE TABLE "business_posts" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "caption" TEXT NOT NULL,
  "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "published" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "business_posts_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "business_post_likes" (
  "post_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_post_likes_pkey" PRIMARY KEY ("post_id", "user_id")
);
CREATE TABLE "business_post_comments" (
  "id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "parent_id" TEXT,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "business_post_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "business_posts_store_id_published_created_at_idx" ON "business_posts"("store_id", "published", "created_at");
CREATE INDEX "business_post_likes_user_id_idx" ON "business_post_likes"("user_id");
CREATE INDEX "business_post_comments_post_id_created_at_idx" ON "business_post_comments"("post_id", "created_at");
CREATE INDEX "business_post_comments_parent_id_idx" ON "business_post_comments"("parent_id");
ALTER TABLE "business_posts" ADD CONSTRAINT "business_posts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_post_likes" ADD CONSTRAINT "business_post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "business_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_post_likes" ADD CONSTRAINT "business_post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_post_comments" ADD CONSTRAINT "business_post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "business_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_post_comments" ADD CONSTRAINT "business_post_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_post_comments" ADD CONSTRAINT "business_post_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "business_post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
