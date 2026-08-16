-- CreateTable
CREATE TABLE "PointsAdjustment" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointsAdjustment_seasonId_idx" ON "PointsAdjustment"("seasonId");

-- CreateIndex
CREATE INDEX "PointsAdjustment_userId_idx" ON "PointsAdjustment"("userId");

-- AddForeignKey
ALTER TABLE "PointsAdjustment" ADD CONSTRAINT "PointsAdjustment_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsAdjustment" ADD CONSTRAINT "PointsAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
