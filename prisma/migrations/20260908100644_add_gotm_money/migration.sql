-- CreateTable
CREATE TABLE "GotmStakePayment" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "batchNumber" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GotmStakePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GotmBatchPayout" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "batchNumber" INTEGER NOT NULL,
    "paidOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,

    CONSTRAINT "GotmBatchPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GotmStakePayment_userId_idx" ON "GotmStakePayment"("userId");

-- CreateIndex
CREATE INDEX "GotmStakePayment_seasonId_batchNumber_idx" ON "GotmStakePayment"("seasonId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GotmStakePayment_seasonId_batchNumber_userId_key" ON "GotmStakePayment"("seasonId", "batchNumber", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GotmBatchPayout_seasonId_batchNumber_key" ON "GotmBatchPayout"("seasonId", "batchNumber");

-- AddForeignKey
ALTER TABLE "GotmStakePayment" ADD CONSTRAINT "GotmStakePayment_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GotmStakePayment" ADD CONSTRAINT "GotmStakePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GotmStakePayment" ADD CONSTRAINT "GotmStakePayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GotmBatchPayout" ADD CONSTRAINT "GotmBatchPayout_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GotmBatchPayout" ADD CONSTRAINT "GotmBatchPayout_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
