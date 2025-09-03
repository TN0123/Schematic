-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "links" TEXT[] DEFAULT ARRAY[]::TEXT[];
