/*
  Warnings:

  - You are about to drop the column `scheduleContext` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "scheduleContext";

-- CreateTable
CREATE TABLE "UserMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" JSONB,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserMemory_userId_type_idx" ON "UserMemory"("userId", "type");

-- CreateIndex
CREATE INDEX "UserMemory_userId_date_idx" ON "UserMemory"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "UserMemory_userId_type_date_key" ON "UserMemory"("userId", "type", "date");

-- AddForeignKey
ALTER TABLE "UserMemory" ADD CONSTRAINT "UserMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
