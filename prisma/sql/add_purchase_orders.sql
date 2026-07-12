-- Purchase Orders + receiving.
--
-- Apply, easiest first:
--   npx prisma db push                 # syncs the whole schema (matches this repo's dev flow)
-- or apply this file directly:
--   npx prisma db execute --file prisma/sql/add_purchase_orders.sql --schema prisma/schema.prisma
-- or:  psql "$DATABASE_URL" -f prisma/sql/add_purchase_orders.sql
--
-- Idempotent: safe to run more than once.

DO $$ BEGIN
  CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT','ORDERED','PARTIAL','RECEIVED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "Supplier" (
  "id"        TEXT PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "email"     TEXT,
  "phone"     TEXT,
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  "id"           TEXT PRIMARY KEY,
  "number"       TEXT NOT NULL,
  "supplierId"   TEXT,
  "supplierName" TEXT,
  "status"       "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "locationId"   TEXT NOT NULL,
  "currency"     TEXT NOT NULL DEFAULT 'IDR',
  "subtotalIdr"  DECIMAL(14,2) NOT NULL DEFAULT 0,
  "notes"        TEXT,
  "createdById"  TEXT,
  "receivedAt"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_number_key" ON "PurchaseOrder"("number");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

CREATE TABLE IF NOT EXISTS "PurchaseOrderLine" (
  "id"              TEXT PRIMARY KEY,
  "purchaseOrderId" TEXT NOT NULL,
  "variantId"       TEXT,
  "description"     TEXT NOT NULL,
  "qty"             INTEGER NOT NULL DEFAULT 1,
  "qtyReceived"     INTEGER NOT NULL DEFAULT 0,
  "unitCostIdr"     DECIMAL(14,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine"("purchaseOrderId");
CREATE INDEX IF NOT EXISTS "PurchaseOrderLine_variantId_idx" ON "PurchaseOrderLine"("variantId");

DO $$ BEGIN
  ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey"
    FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
