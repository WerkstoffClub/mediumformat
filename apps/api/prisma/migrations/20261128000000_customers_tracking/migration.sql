-- Back-office customers, wholesale flag, order channel and fulfilment tracking.

-- WebOrder: channel + optional contact details for back-office orders
ALTER TABLE "WebOrder" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'Website';
ALTER TABLE "WebOrder" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "WebOrder" ALTER COLUMN "phone" DROP NOT NULL;

CREATE TYPE "CustomerSegment" AS ENUM ('RETAIL', 'WHOLESALE');

CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL,
    "dpCustomerId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "channel" TEXT,
    "segment" "CustomerSegment" NOT NULL DEFAULT 'RETAIL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomerProfile_dpCustomerId_key" ON "CustomerProfile"("dpCustomerId");
CREATE INDEX "CustomerProfile_name_idx" ON "CustomerProfile"("name");

CREATE TYPE "TrackingStage" AS ENUM ('PACKED', 'SHIPPED', 'DELIVERED');

CREATE TABLE "OrderTracking" (
    "orderId" TEXT NOT NULL,
    "stage" "TrackingStage" NOT NULL,
    "courier" TEXT,
    "trackingNo" TEXT,
    "packedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrderTracking_pkey" PRIMARY KEY ("orderId")
);
