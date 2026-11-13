-- CreateEnum
CREATE TYPE "PosSaleStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PosPaymentMethod" AS ENUM ('CASH', 'EDC', 'XENDIT', 'OTHER');

-- CreateEnum
CREATE TYPE "PosPaymentStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'FAILED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PosDiscountKind" AS ENUM ('PERCENT', 'FIXED_IDR');

-- CreateTable
CREATE TABLE "PosSale" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "PosSaleStatus" NOT NULL DEFAULT 'PENDING',
    "cashierId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "discountKind" "PosDiscountKind",
    "discountValue" INTEGER,
    "voucherCode" TEXT,
    "subtotalIdr" INTEGER NOT NULL,
    "discountIdr" INTEGER NOT NULL DEFAULT 0,
    "taxIdr" INTEGER NOT NULL,
    "totalIdr" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosSaleLine" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "format" "RecordFormat" NOT NULL,
    "unitPriceIdr" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "PosSaleLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosPayment" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "method" "PosPaymentMethod" NOT NULL,
    "status" "PosPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountIdr" INTEGER NOT NULL,
    "tenderedIdr" INTEGER,
    "changeIdr" INTEGER,
    "edcBank" TEXT,
    "edcApprovalCode" TEXT,
    "edcRrn" TEXT,
    "cardScheme" TEXT,
    "cardLast4" TEXT,
    "xenditExternalId" TEXT,
    "xenditInvoiceId" TEXT,
    "xenditInvoiceUrl" TEXT,
    "xenditChannel" TEXT,
    "xenditPaidMethod" TEXT,
    "expiresAt" TIMESTAMP(3),
    "otherMethodName" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PosSale_number_key" ON "PosSale"("number");

-- CreateIndex
CREATE INDEX "PosSale_status_createdAt_idx" ON "PosSale"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PosSaleLine_saleId_idx" ON "PosSaleLine"("saleId");

-- CreateIndex
CREATE INDEX "PosSaleLine_releaseId_idx" ON "PosSaleLine"("releaseId");

-- CreateIndex
CREATE UNIQUE INDEX "PosPayment_xenditExternalId_key" ON "PosPayment"("xenditExternalId");

-- CreateIndex
CREATE UNIQUE INDEX "PosPayment_xenditInvoiceId_key" ON "PosPayment"("xenditInvoiceId");

-- CreateIndex
CREATE INDEX "PosPayment_saleId_idx" ON "PosPayment"("saleId");

-- AddForeignKey
ALTER TABLE "PosSaleLine" ADD CONSTRAINT "PosSaleLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "PosSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosPayment" ADD CONSTRAINT "PosPayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "PosSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

