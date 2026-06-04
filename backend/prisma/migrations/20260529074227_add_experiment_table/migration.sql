-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 10,
    "needParent" BOOLEAN NOT NULL DEFAULT false,
    "materialType" TEXT,
    "description" TEXT NOT NULL,
    "materialsHome" JSONB,
    "materialsKit" JSONB,
    "safety" TEXT,
    "coverUrl" TEXT,
    "videoUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentItem" (
    "experimentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "ExperimentItem_pkey" PRIMARY KEY ("experimentId","itemId")
);

-- CreateTable
CREATE TABLE "ExperimentKnowledgePoint" (
    "experimentId" TEXT NOT NULL,
    "knowledgePointId" TEXT NOT NULL,

    CONSTRAINT "ExperimentKnowledgePoint_pkey" PRIMARY KEY ("experimentId","knowledgePointId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Experiment_slug_key" ON "Experiment"("slug");

-- CreateIndex
CREATE INDEX "Experiment_status_difficulty_idx" ON "Experiment"("status", "difficulty");

-- AddForeignKey
ALTER TABLE "ExperimentItem" ADD CONSTRAINT "ExperimentItem_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentItem" ADD CONSTRAINT "ExperimentItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentKnowledgePoint" ADD CONSTRAINT "ExperimentKnowledgePoint_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentKnowledgePoint" ADD CONSTRAINT "ExperimentKnowledgePoint_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
