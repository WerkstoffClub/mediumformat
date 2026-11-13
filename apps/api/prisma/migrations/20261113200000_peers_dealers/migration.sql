-- CreateEnum
CREATE TYPE "VenueStatus" AS ENUM ('ONBOARDING', 'LIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ON_SALE', 'SOLD_OUT', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketChannel" AS ENUM ('BOX_OFFICE', 'ONLINE', 'COMP');

-- CreateEnum
CREATE TYPE "TicketPayment" AS ENUM ('CASH', 'QRIS', 'EDC', 'XENDIT', 'NONE');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('VALID', 'VOID');

-- CreateEnum
CREATE TYPE "DealerStatus" AS ENUM ('PROSPECT', 'ONBOARDING', 'LIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "DealerTxnStatus" AS ENUM ('PAID', 'REFUNDED');

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT,
    "area" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Jakarta',
    "capacity" INTEGER,
    "status" "VenueStatus" NOT NULL DEFAULT 'ONBOARDING',
    "feePct" DECIMAL(5,2) NOT NULL DEFAULT 3,
    "contact" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "lineup" TEXT,
    "venueId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "doorsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketTier" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceIdr" INTEGER NOT NULL,
    "quota" INTEGER NOT NULL,
    "salesStart" TIMESTAMP(3),
    "salesEnd" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "holderName" TEXT,
    "holderEmail" TEXT,
    "channel" "TicketChannel" NOT NULL DEFAULT 'BOX_OFFICE',
    "payment" "TicketPayment" NOT NULL DEFAULT 'CASH',
    "priceIdr" INTEGER NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'VALID',
    "soldById" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "checkedInById" TEXT,
    "gate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dealer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT,
    "area" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Jakarta',
    "status" "DealerStatus" NOT NULL DEFAULT 'PROSPECT',
    "feePct" DECIMAL(5,2) NOT NULL DEFAULT 2.5,
    "contact" TEXT,
    "notes" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dealer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerTransaction" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "txnNo" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "items" JSONB NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "payment" TEXT NOT NULL,
    "cashier" TEXT,
    "amountIdr" INTEGER NOT NULL,
    "status" "DealerTxnStatus" NOT NULL DEFAULT 'PAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_venueId_startsAt_idx" ON "Event"("venueId", "startsAt");

-- CreateIndex
CREATE INDEX "Event_startsAt_idx" ON "Event"("startsAt");

-- CreateIndex
CREATE INDEX "TicketTier_eventId_idx" ON "TicketTier"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_code_key" ON "Ticket"("code");

-- CreateIndex
CREATE INDEX "Ticket_eventId_checkedInAt_idx" ON "Ticket"("eventId", "checkedInAt");

-- CreateIndex
CREATE INDEX "Ticket_tierId_idx" ON "Ticket"("tierId");

-- CreateIndex
CREATE UNIQUE INDEX "Dealer_slug_key" ON "Dealer"("slug");

-- CreateIndex
CREATE INDEX "DealerTransaction_dealerId_occurredAt_idx" ON "DealerTransaction"("dealerId", "occurredAt");

-- CreateIndex
CREATE INDEX "DealerTransaction_occurredAt_idx" ON "DealerTransaction"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "DealerTransaction_dealerId_txnNo_key" ON "DealerTransaction"("dealerId", "txnNo");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketTier" ADD CONSTRAINT "TicketTier_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "TicketTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerTransaction" ADD CONSTRAINT "DealerTransaction_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

