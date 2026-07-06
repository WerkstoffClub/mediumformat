-- AlterTable
ALTER TABLE "Release" ADD COLUMN     "channelListings" JSONB,
ADD COLUMN     "compareAtIdr" INTEGER,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mediaGrade" "RecordCondition",
ADD COLUMN     "onSale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preorder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preorderEta" TIMESTAMP(3),
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "sizing" JSONB,
ADD COLUMN     "sleeveGrade" "RecordCondition",
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "tracks" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Release_slug_key" ON "Release"("slug");

