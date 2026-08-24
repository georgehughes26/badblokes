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
 * Month). Every active user appears even before any gameweek has settled —
 * seeded at zero, so the table is never empty. Sort order matches the spec:
 * points desc, then fewest fines, then most wins, then name (so an all-zero
 * table reads alphabetically instead of in arbitrary insertion order).
 */
export async function computeStandings(seasonId: string, gameweekIds?: string[]): Promise<StandingRow[]> {
  const gameweekFilter = gameweekIds
    ? { id: { in: gameweekIds } }
    : { seasonId, status: "SETTLED" as const };

  // Manual season adjustments (e.g. a carried-over penalty unrelated to any
  // pick) only apply to the full season table — never to the GOTM rolling
  // window, which is scoped to a handful of recent gameweeks.
  const [results, jokerCounts, activeUsers, adjustments] = await Promise.all([
    prisma.result.findMany({
      where: { gameweek: gameweekFilter },
      include: { user: true },
    }),
    prisma.pick.groupBy({
      by: ["userId"],
      where: { isJoker: true, gameweek: gameweekIds ? { id: { in: gameweekIds } } : { seasonId } },
      _count: { _all: true },
    }),
    prisma.user.findMany({ where: { active: true } }),
    gameweekIds
      ? Promise.resolve([])
      : prisma.pointsAdjustment.findMany({ where: { seasonId }, include: { user: true } }),
  ]);
  const jokerByUser = new Map(jokerCounts.map((j) => [j.userId, j._count._all]));

  const rows = new Map<string, StandingRow>();
  for (const user of activeUsers) {
    rows.set(user.id, {
      userId: user.id,
      name: user.name,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      fines: 0,
      jokersUsed: jokerByUser.get(user.id) ?? 0,
    });
  }

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
    // A no-pick gameweek still counts as played — and as a loss, same as a
    // picked team that lost. It just doesn't count as a joker use.
    row.played += 1;
    if (result.breachNoPick || result.breachTeamLost) row.lost += 1;
    else row.won += 1;
    row.points += result.points;
    row.fines += result.fineAmount;
    rows.set(result.userId, row);
  }

  for (const adjustment of adjustments) {
    const row = rows.get(adjustment.userId) ?? {
      userId: adjustment.userId,
      name: adjustment.user.name,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      fines: 0,
      jokersUsed: jokerByUser.get(adjustment.userId) ?? 0,
    };
    row.points += adjustment.points;
    rows.set(adjustment.userId, row);
  }

  return [...rows.values()].sort(
    (a, b) => b.points - a.points || a.fines - b.fines || b.won - a.won || a.name.localeCompare(b.name),
  );
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
