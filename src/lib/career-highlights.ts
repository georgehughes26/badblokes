import { prisma } from "@/lib/prisma";
import { computeStandings, getGotmBatches, getGotmWinners } from "@/lib/standings";

export interface CareerHighlights {
  mostSelectedTeam: { name: string; shortName: string; crestUrl: string | null; count: number } | null;
  longestWinStreak: number;
  longestLossStreak: number;
  /** Gameweeks (across every app-tracked season) this player's cumulative table position was 1st, once results existed to rank on — never the pre-results alphabetical starting order. */
  gameweeksAtNumberOne: number;
  /** Same idea, bottom-2 (mirrors StandingsTable's own relegation-zone rule). */
  gameweeksInRelegationZone: number;
  totalFines: number;
  gotmWon: number;
}

/**
 * Everything below is derived from every app-tracked season's Result/Pick
 * rows — there's just the one season so far, but nothing here is scoped to
 * "the active season" specifically, so it keeps working once more exist.
 * None of it exists for the pre-app seasons (only final P/W/L survive from
 * back then), so this can only ever reflect app history.
 */
export async function getPlayerCareerHighlights(userId: string): Promise<CareerHighlights> {
  const [topTeamPick, resultsInOrder, finesAgg, seasons] = await Promise.all([
    prisma.pick.groupBy({
      by: ["teamId"],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { teamId: "desc" } },
      take: 1,
    }),
    prisma.result.findMany({
      where: { userId },
      select: { breachNoPick: true, breachTeamLost: true, gameweek: { select: { weekNumber: true, season: { select: { startDate: true } } } } },
      orderBy: [{ gameweek: { season: { startDate: "asc" } } }, { gameweek: { weekNumber: "asc" } }],
    }),
    prisma.fineLedgerEntry.aggregate({ where: { userId }, _sum: { amount: true } }),
    prisma.season.findMany({ select: { id: true } }),
  ]);

  let mostSelectedTeam: CareerHighlights["mostSelectedTeam"] = null;
  if (topTeamPick.length > 0) {
    const team = await prisma.team.findUnique({ where: { id: topTeamPick[0].teamId } });
    if (team) {
      mostSelectedTeam = { name: team.name, shortName: team.shortName, crestUrl: team.crestUrl, count: topTeamPick[0]._count._all };
    }
  }

  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentWin = 0;
  let currentLoss = 0;
  for (const r of resultsInOrder) {
    // A no-pick is a loss for streak purposes too — same rule computeStandings uses.
    if (r.breachNoPick || r.breachTeamLost) {
      currentLoss += 1;
      currentWin = 0;
    } else {
      currentWin += 1;
      currentLoss = 0;
    }
    longestWinStreak = Math.max(longestWinStreak, currentWin);
    longestLossStreak = Math.max(longestLossStreak, currentLoss);
  }

  let gameweeksAtNumberOne = 0;
  let gameweeksInRelegationZone = 0;
  let gotmWon = 0;
  for (const season of seasons) {
    const settledGameweeks = await prisma.gameweek.findMany({
      where: { seasonId: season.id, status: "SETTLED" },
      orderBy: { weekNumber: "asc" },
      select: { id: true },
    });
    const cumulativeIds: string[] = [];
    for (const gw of settledGameweeks) {
      cumulativeIds.push(gw.id);
      const rows = await computeStandings(season.id, cumulativeIds);
      const rank = rows.findIndex((r) => r.userId === userId);
      if (rank === -1) continue;
      if (rank === 0) gameweeksAtNumberOne += 1;
      if (rows.length > 2 && rank >= rows.length - 2) gameweeksInRelegationZone += 1;
    }

    const { completed } = await getGotmBatches(season.id);
    for (const batch of completed) {
      if (getGotmWinners(batch.rows).some((w) => w.userId === userId)) gotmWon += 1;
    }
  }

  return {
    mostSelectedTeam,
    longestWinStreak,
    longestLossStreak,
    gameweeksAtNumberOne,
    gameweeksInRelegationZone,
    totalFines: finesAgg._sum.amount ?? 0,
    gotmWon,
  };
}
