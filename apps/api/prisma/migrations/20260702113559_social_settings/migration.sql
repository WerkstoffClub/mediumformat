-- CreateTable
CREATE TABLE "SocialSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "waPhone" TEXT,
    "waTemplate" TEXT NOT NULL DEFAULT 'Hi Medium Format! I''d like to buy *{title}* ({price}). Is it still available?',
    "igUsername" TEXT,
    "fbPageUrl" TEXT,
    "storefrontUrlBase" TEXT,
    "feedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialSettings_pkey" PRIMARY KEY ("id")
);

