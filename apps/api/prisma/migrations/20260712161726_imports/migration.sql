-- CreateEnum
CREATE TYPE "ImportOrigin" AS ENUM ('INTERNATIONAL', 'DOMESTIC');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CONSOLIDATED', 'PRICED', 'RECEIVED', 'INVENTORY_UPDATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CREDIT_CARD', 'BANK_TRANSFER', 'PAYPAL', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "ReimbursementStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'REIMBURSED');

-- CreateEnum
CREATE TYPE "SalesChannel" AS ENUM ('SHOPEE', 'TOKOPEDIA', 'WEBSITE', 'POS', 'DISCOGS');

-- CreateEnum
CREATE TYPE "ImportLineMatchStatus" AS ENUM ('MATCHED', 'NEW', 'AMBIGUOUS');

-- CreateEnum
CREATE TYPE "ImportAttachmentKind" AS ENUM ('VENDOR_INVOICE', 'FORWARDER_INVOICE', 'PAYMENT_PROOF', 'REIMBURSEMENT_PROOF');

-- CreateTable
CREATE TABLE "ImportOrder" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "origin" "ImportOrigin" NOT NULL DEFAULT 'INTERNATIONAL',
    "currency" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "fxRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "fxRateSource" TEXT,
    "fxRateManual" BOOLEAN NOT NULL DEFAULT false,
    "vendorShippingNative" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "paidBy" TEXT,
    "reimbursementStatus" "ReimbursementStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "status" "ImportStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotalNative" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "consolidationId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportOrderLine" (
    "id" TEXT NOT NULL,
    "importOrderId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "artist" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "label" TEXT,
    "catNumber" TEXT,
    "barcode" TEXT,
    "formatRaw" TEXT NOT NULL,
    "format" "RecordFormat" NOT NULL,
    "edition" TEXT,
    "qty" INTEGER NOT NULL,
    "qtyBackorder" INTEGER NOT NULL DEFAULT 0,
    "unitPriceNative" DECIMAL(18,2) NOT NULL,
    "extendedNative" DECIMAL(18,2) NOT NULL,
    "weightKg" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "allocatedVendorShipIdr" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "allocatedForwarderIdr" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "landedCostIdr" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discogsId" TEXT,
    "discogsRaw" JSONB,
    "releaseId" TEXT,
    "matchStatus" "ImportLineMatchStatus" NOT NULL DEFAULT 'NEW',
    "createdRelease" BOOLEAN NOT NULL DEFAULT false,
    "storeLocation" "StoreLocation",
    "shelfLocation" TEXT,

    CONSTRAINT "ImportOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportConsolidation" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "forwarderName" TEXT NOT NULL,
    "forwarderInvoiceIdr" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "weightKgTotal" DECIMAL(10,4),
    "trackingRaw" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportConsolidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportLineChannelPrice" (
    "id" TEXT NOT NULL,
    "lineItemId" TEXT NOT NULL,
    "channel" "SalesChannel" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "price" DECIMAL(18,2) NOT NULL,
    "feePctApplied" DECIMAL(6,4) NOT NULL,
    "overridden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ImportLineChannelPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelPricingConfig" (
    "channel" "SalesChannel" NOT NULL,
    "feePct" DECIMAL(6,4) NOT NULL,
    "rounding" TEXT NOT NULL DEFAULT 'NEAREST_1000',
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ChannelPricingConfig_pkey" PRIMARY KEY ("channel")
);

-- CreateTable
CREATE TABLE "ImportAttachment" (
    "id" TEXT NOT NULL,
    "importOrderId" TEXT NOT NULL,
    "kind" "ImportAttachmentKind" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseChannelPrice" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "channel" "SalesChannel" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "price" DECIMAL(18,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseChannelPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportOrder_number_key" ON "ImportOrder"("number");

-- CreateIndex
CREATE INDEX "ImportOrder_status_idx" ON "ImportOrder"("status");

-- CreateIndex
CREATE INDEX "ImportOrder_orderDate_idx" ON "ImportOrder"("orderDate");

-- CreateIndex
CREATE INDEX "ImportOrderLine_importOrderId_idx" ON "ImportOrderLine"("importOrderId");

-- CreateIndex
CREATE INDEX "ImportOrderLine_barcode_idx" ON "ImportOrderLine"("barcode");

-- CreateIndex
CREATE INDEX "ImportOrderLine_releaseId_idx" ON "ImportOrderLine"("releaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportConsolidation_number_key" ON "ImportConsolidation"("number");

-- CreateIndex
CREATE UNIQUE INDEX "ImportLineChannelPrice_lineItemId_channel_key" ON "ImportLineChannelPrice"("lineItemId", "channel");

-- CreateIndex
CREATE INDEX "ImportAttachment_importOrderId_idx" ON "ImportAttachment"("importOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseChannelPrice_releaseId_channel_key" ON "ReleaseChannelPrice"("releaseId", "channel");

-- AddForeignKey
ALTER TABLE "ImportOrder" ADD CONSTRAINT "ImportOrder_consolidationId_fkey" FOREIGN KEY ("consolidationId") REFERENCES "ImportConsolidation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportOrderLine" ADD CONSTRAINT "ImportOrderLine_importOrderId_fkey" FOREIGN KEY ("importOrderId") REFERENCES "ImportOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportOrderLine" ADD CONSTRAINT "ImportOrderLine_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportLineChannelPrice" ADD CONSTRAINT "ImportLineChannelPrice_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "ImportOrderLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportAttachment" ADD CONSTRAINT "ImportAttachment_importOrderId_fkey" FOREIGN KEY ("importOrderId") REFERENCES "ImportOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseChannelPrice" ADD CONSTRAINT "ReleaseChannelPrice_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

