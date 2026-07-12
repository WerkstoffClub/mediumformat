-- CreateEnum
CREATE TYPE "CategoryPageTemplate" AS ENUM ('FULL_HERO', 'HALF_HERO');

-- CreateEnum
CREATE TYPE "CategoryPageStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "CategoryPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "formatFilter" "RecordFormat",
    "template" "CategoryPageTemplate" NOT NULL DEFAULT 'FULL_HERO',
    "kicker" TEXT,
    "headline" TEXT,
    "salesCopy" TEXT,
    "heroImageUrl" TEXT,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "status" "CategoryPageStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryPage_slug_key" ON "CategoryPage"("slug");

-- CreateIndex
CREATE INDEX "CategoryPage_status_publishedAt_idx" ON "CategoryPage"("status", "publishedAt");
