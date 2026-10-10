-- AlterTable
ALTER TABLE "Pick" ADD COLUMN     "fineOverrideAmount" INTEGER,
ADD COLUMN     "fineOverrideReason" TEXT,
ADD COLUMN     "jokerDoublingDisabled" BOOLEAN NOT NULL DEFAULT false;
