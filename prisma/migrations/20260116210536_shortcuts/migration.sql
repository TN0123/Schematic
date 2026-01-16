-- CreateEnum
CREATE TYPE "ShortcutTargetType" AS ENUM ('DOCUMENT', 'BULLETIN');

-- CreateTable
CREATE TABLE "Shortcut" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" "ShortcutTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shortcut_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Shortcut_userId_idx" ON "Shortcut"("userId");

-- CreateIndex
CREATE INDEX "Shortcut_userId_targetType_targetId_idx" ON "Shortcut"("userId", "targetType", "targetId");

-- AddForeignKey
ALTER TABLE "Shortcut" ADD CONSTRAINT "Shortcut_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
