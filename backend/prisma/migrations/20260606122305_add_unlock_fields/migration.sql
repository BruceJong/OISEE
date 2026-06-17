-- AlterTable
ALTER TABLE "Scene" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unlockConditions" JSONB;

-- AlterTable
ALTER TABLE "SceneGroup" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unlockConditions" JSONB,
ADD COLUMN     "unlockHint" TEXT;
