-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "device" TEXT NOT NULL,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageView_at_idx" ON "PageView"("at");
