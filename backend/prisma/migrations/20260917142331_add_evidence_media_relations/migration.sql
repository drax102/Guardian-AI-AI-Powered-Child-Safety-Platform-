/*
  Warnings:

  - You are about to drop the column `evidenceId` on the `Alert` table. All the data in the column will be lost.
  - Added the required column `alertId` to the `EvidenceMedia` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_evidenceId_fkey";

-- DropIndex
DROP INDEX "Alert_evidenceId_key";

-- AlterTable
ALTER TABLE "Alert" DROP COLUMN "evidenceId";

-- AlterTable
ALTER TABLE "EvidenceMedia" ADD COLUMN     "alertId" TEXT NOT NULL,
ADD COLUMN     "resourceType" TEXT NOT NULL DEFAULT 'image';

-- CreateIndex
CREATE INDEX "EvidenceMedia_alertId_idx" ON "EvidenceMedia"("alertId");

-- AddForeignKey
ALTER TABLE "EvidenceMedia" ADD CONSTRAINT "EvidenceMedia_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
