-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hasCompletedScheduleTour" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasCompletedWriteTour" BOOLEAN NOT NULL DEFAULT false;
