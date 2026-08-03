-- Players no longer enter odds when picking (worked out among themselves,
-- outside the app). The short-odds fine becomes a manual admin call at
-- results entry instead, alongside the existing Won / Went 2 up flags.
ALTER TABLE "Pick" DROP COLUMN "oddsFractional",
                   DROP COLUMN "oddsDecimal",
                   ADD COLUMN "resultShortOdds" BOOLEAN;
