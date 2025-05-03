-- AlterTable
ALTER TABLE "Bulletin" ADD COLUMN     "data" JSONB,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'text';
