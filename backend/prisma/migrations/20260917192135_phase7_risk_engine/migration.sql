-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "RiskAssessment" ADD COLUMN     "alertId" TEXT,
ADD COLUMN     "explanation" TEXT,
ADD COLUMN     "model" TEXT NOT NULL DEFAULT 'guardianai-rule-engine',
ADD COLUMN     "modelVersion" TEXT NOT NULL DEFAULT '1.0.0',
ADD COLUMN     "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "childId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RiskAssessment_alertId_key" ON "RiskAssessment"("alertId");

-- CreateIndex
CREATE INDEX "RiskAssessment_alertId_idx" ON "RiskAssessment"("alertId");

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
