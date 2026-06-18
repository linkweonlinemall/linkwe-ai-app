-- AlterTable
ALTER TABLE "ai_usage" ADD COLUMN "token_prompt_total" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ai_usage" ADD COLUMN "token_completion_total" INTEGER NOT NULL DEFAULT 0;
