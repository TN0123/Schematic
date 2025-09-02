-- CreateTable
CREATE TABLE "DailySummaryCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "eventsHash" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySummaryCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailySummaryCache_userId_idx" ON "DailySummaryCache"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailySummaryCache_userId_timezone_dayKey_key" ON "DailySummaryCache"("userId", "timezone", "dayKey");

-- AddForeignKey
ALTER TABLE "DailySummaryCache" ADD CONSTRAINT "DailySummaryCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
