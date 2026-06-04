-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('L1', 'L2', 'L3');

-- CreateEnum
CREATE TYPE "Subject" AS ENUM ('PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'GEOGRAPHY', 'OTHER');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "role" TEXT NOT NULL DEFAULT 'superadmin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "sceneImageUrl" TEXT,
    "iconKind" TEXT,
    "themeColor" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "unlockHint" TEXT,
    "mapPosition" JSONB,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "coverUrl" TEXT,
    "itemImageUrl" TEXT,
    "svgSymbolId" TEXT,
    "shortDesc" TEXT NOT NULL,
    "principleByLevel" JSONB NOT NULL DEFAULT '{}',
    "videoTitle" TEXT,
    "videoDurationSec" INTEGER,
    "principleVideoUrl" TEXT,
    "explodedImageUrl" TEXT,
    "parts" JSONB,
    "scenePosition" JSONB,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgePoint" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" "Subject" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "illustrationUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "KnowledgePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemKnowledgePoint" (
    "itemId" TEXT NOT NULL,
    "knowledgePointId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemKnowledgePoint_pkey" PRIMARY KEY ("itemId","knowledgePointId")
);

-- CreateTable
CREATE TABLE "KnowledgeRelation" (
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "relationType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeRelation_pkey" PRIMARY KEY ("fromId","toId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_slug_key" ON "Scene"("slug");

-- CreateIndex
CREATE INDEX "Scene_status_sortOrder_idx" ON "Scene"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Item_slug_key" ON "Item"("slug");

-- CreateIndex
CREATE INDEX "Item_sceneId_sortOrder_idx" ON "Item"("sceneId", "sortOrder");

-- CreateIndex
CREATE INDEX "Item_status_idx" ON "Item"("status");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgePoint_slug_key" ON "KnowledgePoint"("slug");

-- CreateIndex
CREATE INDEX "KnowledgePoint_subject_difficulty_idx" ON "KnowledgePoint"("subject", "difficulty");

-- CreateIndex
CREATE INDEX "KnowledgePoint_status_idx" ON "KnowledgePoint"("status");

-- CreateIndex
CREATE INDEX "ItemKnowledgePoint_knowledgePointId_idx" ON "ItemKnowledgePoint"("knowledgePointId");

-- CreateIndex
CREATE INDEX "KnowledgeRelation_toId_idx" ON "KnowledgeRelation"("toId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemKnowledgePoint" ADD CONSTRAINT "ItemKnowledgePoint_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemKnowledgePoint" ADD CONSTRAINT "ItemKnowledgePoint_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeRelation" ADD CONSTRAINT "KnowledgeRelation_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "KnowledgePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeRelation" ADD CONSTRAINT "KnowledgeRelation_toId_fkey" FOREIGN KEY ("toId") REFERENCES "KnowledgePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
