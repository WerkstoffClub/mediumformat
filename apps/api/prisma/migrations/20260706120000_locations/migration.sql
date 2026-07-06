-- CreateEnum
CREATE TYPE "LocationKind" AS ENUM ('RETAIL', 'STORAGE', 'TEMPORARY', 'CONSIGNMENT');

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "LocationKind" NOT NULL DEFAULT 'RETAIL',
    "address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "shelves" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "matchKey" TEXT,
    "storeLocation" "StoreLocation",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Location_kind_idx" ON "Location"("kind");
