-- CreateTable
CREATE TABLE "DailySuggestionsCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "eventsHash" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySuggestionsCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailySuggestionsCache_userId_idx" ON "DailySuggestionsCache"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailySuggestionsCache_userId_timezone_dayKey_key" ON "DailySuggestionsCache"("userId", "timezone", "dayKey");

-- AddForeignKey
ALTER TABLE "DailySuggestionsCache" ADD CONSTRAINT "DailySuggestionsCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
