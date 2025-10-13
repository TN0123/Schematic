-- CreateEnum
CREATE TYPE "HabitType" AS ENUM ('MEAL', 'WORKOUT', 'MEETING', 'COMMUTE', 'WORK_BLOCK', 'PERSONAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "habitLearningEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastHabitRefinementAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EventAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT,
    "actionType" TEXT NOT NULL,
    "eventTitle" TEXT NOT NULL,
    "eventStart" TIMESTAMP(3) NOT NULL,
    "eventEnd" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitType" "HabitType" NOT NULL,
    "timeSlotHistogram" JSONB NOT NULL,
    "centroid" JSONB NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HabitProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitCluster" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clusterLabel" TEXT NOT NULL,
    "exemplarTitle" TEXT NOT NULL,
    "embedding" JSONB NOT NULL,
    "memberEventIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRefinedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HabitCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJobLog" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "BackgroundJobLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventAction_userId_idx" ON "EventAction"("userId");

-- CreateIndex
CREATE INDEX "EventAction_recordedAt_idx" ON "EventAction"("recordedAt");

-- CreateIndex
CREATE INDEX "HabitProfile_userId_idx" ON "HabitProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HabitProfile_userId_habitType_key" ON "HabitProfile"("userId", "habitType");

-- CreateIndex
CREATE INDEX "HabitCluster_userId_idx" ON "HabitCluster"("userId");

-- CreateIndex
CREATE INDEX "BackgroundJobLog_jobType_idx" ON "BackgroundJobLog"("jobType");

-- CreateIndex
CREATE INDEX "BackgroundJobLog_startedAt_idx" ON "BackgroundJobLog"("startedAt");

-- AddForeignKey
ALTER TABLE "EventAction" ADD CONSTRAINT "EventAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitProfile" ADD CONSTRAINT "HabitProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitCluster" ADD CONSTRAINT "HabitCluster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
