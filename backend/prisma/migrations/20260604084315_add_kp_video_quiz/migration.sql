-- AlterTable
ALTER TABLE "KnowledgePoint" ADD COLUMN     "videoDurationSec" INTEGER,
ADD COLUMN     "videoTitle" TEXT,
ADD COLUMN     "videoUrl" TEXT;

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "knowledgePointId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "choices" JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "explanation" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'L1',
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizQuestion_knowledgePointId_sortOrder_idx" ON "QuizQuestion"("knowledgePointId", "sortOrder");

-- CreateIndex
CREATE INDEX "QuizQuestion_status_idx" ON "QuizQuestion"("status");

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
