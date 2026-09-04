-- CreateTable
CREATE TABLE "HistoricSeason" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "HistoricSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricStanding" (
    "id" TEXT NOT NULL,
    "historicSeasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "played" INTEGER NOT NULL,
    "won" INTEGER NOT NULL,
    "lost" INTEGER NOT NULL,

    CONSTRAINT "HistoricStanding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HistoricSeason_label_key" ON "HistoricSeason"("label");

-- CreateIndex
CREATE INDEX "HistoricStanding_userId_idx" ON "HistoricStanding"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HistoricStanding_historicSeasonId_userId_key" ON "HistoricStanding"("historicSeasonId", "userId");

-- AddForeignKey
ALTER TABLE "HistoricStanding" ADD CONSTRAINT "HistoricStanding_historicSeasonId_fkey" FOREIGN KEY ("historicSeasonId") REFERENCES "HistoricSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricStanding" ADD CONSTRAINT "HistoricStanding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
