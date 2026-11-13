-- CreateEnum
CREATE TYPE "WebOrderStatus" AS ENUM ('PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Fulfilment" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateTable
CREATE TABLE "WebOrder" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "WebOrderStatus" NOT NULL DEFAULT 'PENDING',
    "customerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "fulfilment" "Fulfilment" NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "notes" TEXT,
    "voucherCode" TEXT,
    "subtotalIdr" INTEGER NOT NULL,
    "discountIdr" INTEGER NOT NULL DEFAULT 0,
    "totalIdr" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebOrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "format" "RecordFormat" NOT NULL,
    "unitPriceIdr" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "WebOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebOrder_number_key" ON "WebOrder"("number");

-- CreateIndex
CREATE INDEX "WebOrder_status_createdAt_idx" ON "WebOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WebOrderLine_orderId_idx" ON "WebOrderLine"("orderId");

-- AddForeignKey
ALTER TABLE "WebOrderLine" ADD CONSTRAINT "WebOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "WebOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
