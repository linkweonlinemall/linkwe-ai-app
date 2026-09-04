CREATE TABLE "store_daily_views" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_daily_views_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_daily_views_store_id_date_key"
ON "store_daily_views"("store_id", "date");

CREATE INDEX "store_daily_views_date_idx" ON "store_daily_views"("date");

ALTER TABLE "store_daily_views"
ADD CONSTRAINT "store_daily_views_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
