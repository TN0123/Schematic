-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleCalendarId" TEXT,
ADD COLUMN     "googleCalendarLastSyncAt" TIMESTAMP(3),
ADD COLUMN     "googleCalendarSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "googleCalendarSyncToken" TEXT,
ADD COLUMN     "googleCalendarWatchChannelId" TEXT,
ADD COLUMN     "googleCalendarWatchExpiration" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SyncedEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "localEventId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "googleCalendarId" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncHash" TEXT NOT NULL,

    CONSTRAINT "SyncedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SyncedEvent_localEventId_key" ON "SyncedEvent"("localEventId");

-- CreateIndex
CREATE INDEX "SyncedEvent_userId_googleEventId_idx" ON "SyncedEvent"("userId", "googleEventId");

-- CreateIndex
CREATE INDEX "SyncedEvent_userId_googleCalendarId_idx" ON "SyncedEvent"("userId", "googleCalendarId");

-- AddForeignKey
ALTER TABLE "SyncedEvent" ADD CONSTRAINT "SyncedEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
