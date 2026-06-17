-- AlterTable
ALTER TABLE "Scene" ADD COLUMN     "sceneGroupId" TEXT,
ADD COLUMN     "sceneImagePrompt" TEXT;

-- CreateTable
CREATE TABLE "SceneGroup" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mapImageUrl" TEXT,
    "mapImagePrompt" TEXT,
    "iconKind" TEXT,
    "themeColor" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SceneGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTask" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "resultUrl" TEXT,
    "errorMessage" TEXT,
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SceneGroup_slug_key" ON "SceneGroup"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SceneGroup_name_key" ON "SceneGroup"("name");

-- CreateIndex
CREATE INDEX "SceneGroup_status_sortOrder_idx" ON "SceneGroup"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "AiTask_entityType_entityId_idx" ON "AiTask"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AiTask_status_idx" ON "AiTask"("status");

-- CreateIndex
CREATE INDEX "AiTask_adminId_createdAt_idx" ON "AiTask"("adminId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AdminSetting_key_key" ON "AdminSetting"("key");

-- CreateIndex
CREATE INDEX "Scene_sceneGroupId_idx" ON "Scene"("sceneGroupId");

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_sceneGroupId_fkey" FOREIGN KEY ("sceneGroupId") REFERENCES "SceneGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
