-- AlterTable
ALTER TABLE "Result" ADD COLUMN "voided" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "NoPickSlip" (
    "id" TEXT NOT NULL,
    "gameweekId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "externalUrl" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoPickSlip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NoPickSlip_token_key" ON "NoPickSlip"("token");

-- CreateIndex
CREATE UNIQUE INDEX "NoPickSlip_gameweekId_userId_key" ON "NoPickSlip"("gameweekId", "userId");

-- AddForeignKey
ALTER TABLE "NoPickSlip" ADD CONSTRAINT "NoPickSlip_gameweekId_fkey" FOREIGN KEY ("gameweekId") REFERENCES "Gameweek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoPickSlip" ADD CONSTRAINT "NoPickSlip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
