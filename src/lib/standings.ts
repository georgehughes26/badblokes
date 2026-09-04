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
 * subset of gameweeks (e.g. one 4-gameweek Gambler of the Month batch — see
 * getGotmBatches). Every active user appears even before any gameweek has settled —
 * seeded at zero, so the table is never empty. Sort order matches the spec:
 * points desc, then fewest fines, then most wins, then name (so an all-zero
 * table reads alphabetically instead of in arbitrary insertion order).
 */
export async function computeStandings(seasonId: string, gameweekIds?: string[]): Promise<StandingRow[]> {
  const gameweekFilter = gameweekIds
    ? { id: { in: gameweekIds } }
    : { seasonId, status: "SETTLED" as const };

  // Manual season adjustments (e.g. a carried-over penalty unrelated to any
  // pick) only apply to the full season table — never to a GOTM batch,
  // which is scoped to that batch's own 4 gameweeks.
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

export const GOTM_BATCH_SIZE = 4;

export interface GotmBatch {
  /** 1-indexed — batch 1 is weeks 1-4, batch 2 is weeks 5-8, etc. */
  batchNumber: number;
  /** Every weekNumber that belongs to this batch, whether or not it's settled yet. */
  weekNumbers: number[];
  /** Settled gameweeks within this batch only — what the standings below are computed from. */
  gameweekIds: string[];
  /** True once all 4 weeks of the batch exist and are settled — it's done and won't change again. */
  complete: boolean;
  rows: StandingRow[];
}

/**
 * Gambler of the Month, as fixed non-overlapping 4-gameweek batches (weeks
 * 1-4, then 5-8, ...) rather than a trailing window — a batch fills up,
 * gets its own frozen table and winner(s), and then the live table resets
 * to zero for the next batch. `current` is the one still filling up (rows
 * seeded at zero until its first result lands); `completed` is every
 * finished batch, most recent first.
 */
export async function getGotmBatches(seasonId: string): Promise<{ current: GotmBatch; completed: GotmBatch[] }> {
  const gameweeks = await prisma.gameweek.findMany({
    where: { seasonId },
    orderBy: { weekNumber: "asc" },
    select: { id: true, weekNumber: true, status: true },
  });

  interface BatchAccumulator {
    batchNumber: number;
    weekNumbers: number[];
    gameweekIds: string[];
    totalCount: number;
  }
  const batchesByNumber = new Map<number, BatchAccumulator>();
  for (const gw of gameweeks) {
    const batchNumber = Math.floor((gw.weekNumber - 1) / GOTM_BATCH_SIZE) + 1;
    let batch = batchesByNumber.get(batchNumber);
    if (!batch) {
      batch = { batchNumber, weekNumbers: [], gameweekIds: [], totalCount: 0 };
      batchesByNumber.set(batchNumber, batch);
    }
    batch.weekNumbers.push(gw.weekNumber);
    batch.totalCount += 1;
    if (gw.status === "SETTLED") batch.gameweekIds.push(gw.id);
  }

  const completed: GotmBatch[] = [];
  let current: GotmBatch | null = null;

  for (const batch of [...batchesByNumber.values()].sort((a, b) => a.batchNumber - b.batchNumber)) {
    const complete = batch.totalCount === GOTM_BATCH_SIZE && batch.gameweekIds.length === GOTM_BATCH_SIZE;
    const rows = await computeStandings(seasonId, batch.gameweekIds);
    const resolved: GotmBatch = { ...batch, complete, rows };
    if (complete) completed.push(resolved);
    // The first batch that isn't done yet is the live one — batches fill
    // up in order, so nothing past it should exist to consider instead.
    else if (!current) current = resolved;
  }

  // Nothing to fill yet (brand-new season, or the last batch just
  // completed and the next gameweek hasn't been created) — an empty batch
  // ready to go, exactly as if its first gameweek existed but hadn't settled.
  if (!current) {
    current = {
      batchNumber: completed.length + 1,
      weekNumbers: [],
      gameweekIds: [],
      complete: false,
      rows: await computeStandings(seasonId, []),
    };
  }

  return { current, completed: completed.reverse() };
}

/** Whoever's tied on the most points in a batch — usually one player, but a points tie is a shared win. */
export function getGotmWinners(rows: StandingRow[]): StandingRow[] {
  if (rows.length === 0) return [];
  const topPoints = rows[0].points;
  return rows.filter((r) => r.points === topPoints);
}
