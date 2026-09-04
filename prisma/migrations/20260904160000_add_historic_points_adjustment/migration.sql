-- CreateTable
CREATE TABLE "HistoricPointsAdjustment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricPointsAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistoricPointsAdjustment_userId_idx" ON "HistoricPointsAdjustment"("userId");

-- AddForeignKey
ALTER TABLE "HistoricPointsAdjustment" ADD CONSTRAINT "HistoricPointsAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
