-- DropIndex
DROP INDEX "Document_userId_idx";

-- DropIndex
DROP INDEX "EventAction_recordedAt_idx";

-- DropIndex
DROP INDEX "EventAction_userId_idx";

-- DropIndex
DROP INDEX "ProductUpdate_isPublished_idx";

-- DropIndex
DROP INDEX "ProductUpdate_publishedAt_idx";

-- DropIndex
DROP INDEX "Reminder_userId_idx";

-- CreateIndex
CREATE INDEX "Bulletin_userId_updatedAt_idx" ON "Bulletin"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Bulletin_userId_type_updatedAt_idx" ON "Bulletin"("userId", "type", "updatedAt");

-- CreateIndex
CREATE INDEX "Document_userId_updatedAt_idx" ON "Document"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Event_userId_start_idx" ON "Event"("userId", "start");

-- CreateIndex
CREATE INDEX "Event_userId_end_idx" ON "Event"("userId", "end");

-- CreateIndex
CREATE INDEX "EventAction_userId_recordedAt_idx" ON "EventAction"("userId", "recordedAt");

-- CreateIndex
CREATE INDEX "EventAction_userId_actionType_recordedAt_idx" ON "EventAction"("userId", "actionType", "recordedAt");

-- CreateIndex
CREATE INDEX "Goal_userId_type_createdAt_idx" ON "Goal"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "ProductUpdate_isPublished_publishedAt_idx" ON "ProductUpdate"("isPublished", "publishedAt");

-- CreateIndex
CREATE INDEX "Reminder_userId_isRead_time_idx" ON "Reminder"("userId", "isRead", "time");
