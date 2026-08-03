-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "division" TEXT;

-- CreateIndex
CREATE INDEX "Team_division_idx" ON "Team"("division");
