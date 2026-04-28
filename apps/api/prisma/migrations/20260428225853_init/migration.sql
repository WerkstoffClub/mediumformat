-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'SHOPKEEPER', 'WHOLESALER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "RecordFormat" AS ENUM ('LP', 'TWO_LP', 'THREE_LP', 'TWELVE_INCH', 'SEVEN_INCH', 'CD', 'TWO_CD', 'MERCH');

-- CreateEnum
CREATE TYPE "RecordCondition" AS ENUM ('M', 'VGP', 'VG', 'GP', 'G', 'F', 'P');

-- CreateEnum
CREATE TYPE "StoreLocation" AS ENUM ('MAIN_STORE', 'WAREHOUSE', 'CONSIGNMENT');

-- CreateEnum
CREATE TYPE "PostCategory" AS ENUM ('STAFF_PICKS', 'HIGHLIGHTS', 'NEWS', 'INTERVIEW');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "coverUrl" TEXT,
    "category" "PostCategory" NOT NULL DEFAULT 'NEWS',
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "label" TEXT,
    "catNumber" TEXT,
    "year" INTEGER,
    "format" "RecordFormat" NOT NULL,
    "genre" TEXT,
    "condition" "RecordCondition" NOT NULL,
    "priceIdr" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "imageUrl" TEXT,
    "barcode" TEXT,
    "storeLocation" "StoreLocation" NOT NULL DEFAULT 'MAIN_STORE',
    "shelfLocation" TEXT,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 2,
    "discogsId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Post_status_publishedAt_idx" ON "Post"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Post_category_idx" ON "Post"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Release_barcode_key" ON "Release"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "Release_discogsId_key" ON "Release"("discogsId");

-- CreateIndex
CREATE INDEX "Release_artist_title_idx" ON "Release"("artist", "title");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
