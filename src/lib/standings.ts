import { prisma } from "@/lib/prisma";

export interface StandingRow {
  userId: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  fines: number;
  jokersUsed: number;
}

/**
 * Aggregate Result rows into a standings table, optionally restricted to a
 * subset of gameweeks (e.g. the last 4 settled ones, for Gambler of the
 * Month). Sort order matches the spec: points desc, then fewest fines, then
 * most wins.
 */
export async function computeStandings(seasonId: string, gameweekIds?: string[]): Promise<StandingRow[]> {
  const gameweekFilter = gameweekIds
    ? { id: { in: gameweekIds } }
    : { seasonId, status: "SETTLED" as const };

  const [results, jokerCounts] = await Promise.all([
    prisma.result.findMany({
      where: { gameweek: gameweekFilter },
      include: { user: true },
    }),
    prisma.pick.groupBy({
      by: ["userId"],
      where: { isJoker: true, gameweek: gameweekIds ? { id: { in: gameweekIds } } : { seasonId } },
      _count: { _all: true },
    }),
  ]);
  const jokerByUser = new Map(jokerCounts.map((j) => [j.userId, j._count._all]));

  const rows = new Map<string, StandingRow>();
  for (const result of results) {
    const row = rows.get(result.userId) ?? {
      userId: result.userId,
      name: result.user.name,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      fines: 0,
      jokersUsed: jokerByUser.get(result.userId) ?? 0,
    };
    if (!result.breachNoPick) {
      row.played += 1;
      if (result.breachTeamLost) row.lost += 1;
      else row.won += 1;
    }
    row.points += result.points;
    row.fines += result.fineAmount;
    rows.set(result.userId, row);
  }

  return [...rows.values()].sort((a, b) => b.points - a.points || a.fines - b.fines || b.won - a.won);
}

export const GOTM_WINDOW_GAMEWEEKS = 4;

/** The most recent N settled gameweeks in a season, for the Gambler of the Month rolling table. */
export async function getRecentSettledGameweekIds(seasonId: string, windowSize = GOTM_WINDOW_GAMEWEEKS): Promise<string[]> {
  const gameweeks = await prisma.gameweek.findMany({
    where: { seasonId, status: "SETTLED" },
    orderBy: { weekNumber: "desc" },
    take: windowSize,
    select: { id: true },
  });
  return gameweeks.map((g) => g.id);
}
