-- AlterTable
ALTER TABLE "Release" ADD COLUMN     "costIdr" INTEGER,
ADD COLUMN     "dealposProductId" TEXT,
ADD COLUMN     "dealposVariantId" TEXT;

-- CreateTable
CREATE TABLE "DpOutlet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "suspended" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DpOutlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DpSupplier" (
    "name" TEXT NOT NULL,
    "code" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "email" TEXT,

    CONSTRAINT "DpSupplier_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "DpCustomer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "birthDate" TIMESTAMP(3),
    "joinDate" TIMESTAMP(3),

    CONSTRAINT "DpCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DpPaymentMethod" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "suspended" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DpPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DpInvoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "outlet" TEXT,
    "customerName" TEXT,
    "tag" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "created" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "gross" DECIMAL(18,2),
    "discountTotal" DECIMAL(18,2),
    "tax" DECIMAL(18,2),
    "sales" DECIMAL(18,2),
    "surcharge" DECIMAL(18,2),
    "paymentStatus" TEXT,
    "fulfillment" TEXT,
    "isVoid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DpInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DpInvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "variantId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "quantity" DECIMAL(18,3) NOT NULL,
    "cost" DECIMAL(18,2),
    "price" DECIMAL(18,2) NOT NULL,
    "discountAmount" DECIMAL(18,2),
    "sales" DECIMAL(18,2),
    "tax" DECIMAL(18,2),

    CONSTRAINT "DpInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DpInvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "amount" DECIMAL(18,2) NOT NULL,
    "method" TEXT NOT NULL,
    "code" TEXT,
    "note" TEXT,

    CONSTRAINT "DpInvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DpBill" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "outlet" TEXT,
    "supplierName" TEXT,
    "type" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "due" TIMESTAMP(3),
    "created" TIMESTAMP(3),
    "amount" DECIMAL(18,2) NOT NULL,
    "gross" DECIMAL(18,2),
    "tax" DECIMAL(18,2),
    "purchase" DECIMAL(18,2),
    "delivery" TEXT,
    "paymentStatus" TEXT,

    CONSTRAINT "DpBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DpBillLine" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "variantId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "quantity" DECIMAL(18,3) NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "discount" DECIMAL(18,2),

    CONSTRAINT "DpBillLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncState" (
    "entity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "message" TEXT,
    "cursor" TEXT,
    "lastRunAt" TIMESTAMP(3),

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("entity")
);

-- CreateIndex
CREATE UNIQUE INDEX "DpInvoice_number_key" ON "DpInvoice"("number");

-- CreateIndex
CREATE INDEX "DpInvoice_date_idx" ON "DpInvoice"("date");

-- CreateIndex
CREATE INDEX "DpInvoice_tag_idx" ON "DpInvoice"("tag");

-- CreateIndex
CREATE INDEX "DpInvoice_outlet_idx" ON "DpInvoice"("outlet");

-- CreateIndex
CREATE INDEX "DpInvoiceLine_invoiceId_idx" ON "DpInvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "DpInvoiceLine_variantId_idx" ON "DpInvoiceLine"("variantId");

-- CreateIndex
CREATE INDEX "DpInvoiceLine_code_idx" ON "DpInvoiceLine"("code");

-- CreateIndex
CREATE INDEX "DpInvoicePayment_invoiceId_idx" ON "DpInvoicePayment"("invoiceId");

-- CreateIndex
CREATE INDEX "DpInvoicePayment_method_idx" ON "DpInvoicePayment"("method");

-- CreateIndex
CREATE INDEX "DpBill_date_idx" ON "DpBill"("date");

-- CreateIndex
CREATE INDEX "DpBill_supplierName_idx" ON "DpBill"("supplierName");

-- CreateIndex
CREATE INDEX "DpBillLine_billId_idx" ON "DpBillLine"("billId");

-- CreateIndex
CREATE INDEX "DpBillLine_variantId_idx" ON "DpBillLine"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "Release_dealposVariantId_key" ON "Release"("dealposVariantId");

-- AddForeignKey
ALTER TABLE "DpInvoiceLine" ADD CONSTRAINT "DpInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "DpInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DpInvoicePayment" ADD CONSTRAINT "DpInvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "DpInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DpBillLine" ADD CONSTRAINT "DpBillLine_billId_fkey" FOREIGN KEY ("billId") REFERENCES "DpBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

