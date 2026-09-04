import { prisma } from "@/lib/prisma";
import { computeStandings, getGotmBatches, getGotmWinners } from "@/lib/standings";

export type TrophyKind = "champion" | "wooden-spoon" | "gotm" | "adjustment";

export interface Trophy {
  kind: TrophyKind;
  title: string;
  subtitle: string;
  /** Silverware vs. shame — a forfeit (HistoricPointsAdjustment/PointsAdjustment with points < 0) is positive: false. */
  positive: boolean;
}

/**
 * Every honour (and forfeit) a player has picked up: league titles and
 * wooden spoons from both the pre-app seasons (by win count) and any
 * finished app-tracked season (by points), every completed Gambler of the
 * Month batch they won outright or shared, and every manual adjustment
 * (e.g. "First To Leave <year>") tied to them by name.
 */
export async function getPlayerTrophyCabinet(userId: string): Promise<Trophy[]> {
  const trophies: Trophy[] = [];

  const historicSeasons = await prisma.historicSeason.findMany({
    orderBy: { order: "asc" },
    include: { standings: true },
  });
  for (const season of historicSeasons) {
    if (season.standings.length === 0) continue;
    const mine = season.standings.find((s) => s.userId === userId);
    if (!mine) continue;
    const maxWon = Math.max(...season.standings.map((s) => s.won));
    const minWon = Math.min(...season.standings.map((s) => s.won));
    if (mine.won === maxWon) trophies.push({ kind: "champion", title: "League Champion", subtitle: season.label, positive: true });
    if (mine.won === minWon && season.standings.length > 1) {
      trophies.push({ kind: "wooden-spoon", title: "Wooden Spoon", subtitle: season.label, positive: false });
    }
  }

  // Only a finished app season crowns a champion — the active one is still being played.
  const finishedSeasons = await prisma.season.findMany({ where: { active: false } });
  for (const season of finishedSeasons) {
    const rows = await computeStandings(season.id);
    if (rows.length === 0) continue;
    const mine = rows.find((r) => r.userId === userId);
    if (!mine) continue;
    const maxPoints = rows[0].points;
    const minPoints = rows[rows.length - 1].points;
    if (mine.points === maxPoints) trophies.push({ kind: "champion", title: "League Champion", subtitle: season.name, positive: true });
    if (mine.points === minPoints && rows.length > 1) {
      trophies.push({ kind: "wooden-spoon", title: "Wooden Spoon", subtitle: season.name, positive: false });
    }
  }

  // GOTM is awarded batch-by-batch, so it can land mid-season, unlike the two above.
  const allSeasons = await prisma.season.findMany();
  for (const season of allSeasons) {
    const { completed } = await getGotmBatches(season.id);
    for (const batch of completed) {
      if (getGotmWinners(batch.rows).some((w) => w.userId === userId)) {
        trophies.push({ kind: "gotm", title: "Gambler of the Month", subtitle: `${season.name} — GOTM ${batch.batchNumber}`, positive: true });
      }
    }
  }

  const [seasonAdjustments, historicAdjustments] = await Promise.all([
    prisma.pointsAdjustment.findMany({ where: { userId }, include: { season: true } }),
    prisma.historicPointsAdjustment.findMany({ where: { userId } }),
  ]);
  for (const adj of seasonAdjustments) {
    trophies.push({ kind: "adjustment", title: adj.reason, subtitle: adj.season.name, positive: adj.points > 0 });
  }
  for (const adj of historicAdjustments) {
    trophies.push({ kind: "adjustment", title: adj.reason, subtitle: "Career", positive: adj.points > 0 });
  }

  return trophies;
}
