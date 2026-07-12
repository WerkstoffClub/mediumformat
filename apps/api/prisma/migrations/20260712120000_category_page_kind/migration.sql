-- CreateEnum
CREATE TYPE "CategoryPageKind" AS ENUM ('PRODUCT_PAGE', 'NEWS_CATEGORY');

-- AlterTable
ALTER TABLE "CategoryPage"
  ADD COLUMN "kind" "CategoryPageKind" NOT NULL DEFAULT 'PRODUCT_PAGE',
  ADD COLUMN "newsCategoryKey" "PostCategory";

-- CreateIndex
CREATE UNIQUE INDEX "CategoryPage_newsCategoryKey_key" ON "CategoryPage"("newsCategoryKey");

-- CreateIndex
CREATE INDEX "CategoryPage_kind_status_idx" ON "CategoryPage"("kind", "status");
