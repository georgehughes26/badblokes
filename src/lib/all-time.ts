import { prisma } from "@/lib/prisma";

export interface AllTimeRow {
  userId: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  points: number;
}

/** A points-only adjustment feeding into a player's All Time total — either a season-scoped PointsAdjustment or a career-wide HistoricPointsAdjustment. Used to asterisk/footnote the All Time Table. */
export interface AllTimeAdjustmentNote {
  userId: string;
  points: number;
  reason: string;
}

interface CareerStats {
  played: number;
  won: number;
  lost: number;
  points: number;
}

function emptyCareerStats(): CareerStats {
  return { played: 0, won: 0, lost: 0, points: 0 };
}

function combine(a: CareerStats, b: CareerStats): CareerStats {
  return { played: a.played + b.played, won: a.won + b.won, lost: a.lost + b.lost, points: a.points + b.points };
}

/**
 * Every Result row the app itself has ever recorded, across every season —
 * not just the active one — plus every season-scoped PointsAdjustment
 * (e.g. a "First To Leave" forfeit), which affects points only, never
 * played/won/lost.
 */
async function getAppWideCareerStats(): Promise<Map<string, CareerStats>> {
  const [results, adjustments] = await Promise.all([
    prisma.result.findMany({ select: { userId: true, points: true, breachNoPick: true, breachTeamLost: true } }),
    prisma.pointsAdjustment.findMany({ select: { userId: true, points: true } }),
  ]);
  const map = new Map<string, CareerStats>();
  for (const r of results) {
    const row = map.get(r.userId) ?? emptyCareerStats();
    row.played += 1;
    // Same "played and lost" rule as computeStandings — a no-pick counts as
    // a loss too, not a non-event.
    if (r.breachNoPick || r.breachTeamLost) row.lost += 1;
    else row.won += 1;
    row.points += r.points;
    map.set(r.userId, row);
  }
  for (const adj of adjustments) {
    const row = map.get(adj.userId) ?? emptyCareerStats();
    row.points += adj.points;
    map.set(adj.userId, row);
  }
  return map;
}

/**
 * Final P/W/L from every pre-app season (hand-entered via HistoricStanding)
 * plus every career-wide HistoricPointsAdjustment — a penalty/bonus from
 * before the app existed that isn't tied to one specific historic season,
 * so it only ever moves the points total, never played/won/lost.
 */
async function getHistoricCareerStats(): Promise<Map<string, CareerStats>> {
  const [standings, adjustments] = await Promise.all([
    prisma.historicStanding.findMany({ select: { userId: true, played: true, won: true, lost: true } }),
    prisma.historicPointsAdjustment.findMany({ select: { userId: true, points: true } }),
  ]);
  const map = new Map<string, CareerStats>();
  for (const s of standings) {
    const row = map.get(s.userId) ?? emptyCareerStats();
    // There was no separate points concept pre-app — that era's win count
    // (already scored under its own joker-worth-2 convention, see
    // HistoricStanding in schema.prisma) stands in for points as-is.
    map.set(s.userId, combine(row, { played: s.played, won: s.won, lost: s.lost, points: s.won }));
  }
  for (const adj of adjustments) {
    const row = map.get(adj.userId) ?? emptyCareerStats();
    row.points += adj.points;
    map.set(adj.userId, row);
  }
  return map;
}

/**
 * Every active player's career record — every app-tracked season's results
 * plus the hand-entered pre-app seasons — combined into one ledger. This is
 * the All Time Table: ranked by points, where an app-tracked season
 * contributes its real Result.points (joker wins worth 2, multi-breach
 * penalties included) and a pre-app season contributes its win count
 * as-is, since that already was that era's score. Either side's points can
 * also carry a manual adjustment (a forfeit like "First To Leave <year>")
 * — see getAllTimeAdjustmentNotes for the matching footnote text.
 */
export async function computeAllTimeStandings(): Promise<AllTimeRow[]> {
  const [appWide, historic, activeUsers] = await Promise.all([
    getAppWideCareerStats(),
    getHistoricCareerStats(),
    prisma.user.findMany({ where: { active: true } }),
  ]);

  const rows: AllTimeRow[] = activeUsers.map((user) => ({
    userId: user.id,
    name: user.name,
    ...combine(appWide.get(user.id) ?? emptyCareerStats(), historic.get(user.id) ?? emptyCareerStats()),
  }));

  return rows.sort(
    (a, b) => b.points - a.points || a.lost - b.lost || b.won - a.won || a.name.localeCompare(b.name),
  );
}

/** One player's career P/W/L/points — the all-time half of the History page's profile header. */
export async function getUserAllTimeStats(userId: string): Promise<AllTimeRow | null> {
  const rows = await computeAllTimeStandings();
  return rows.find((r) => r.userId === userId) ?? null;
}

/** Every adjustment (season-scoped or career-wide) that has quietly moved someone's All Time points — for the table's asterisk footnotes. */
export async function getAllTimeAdjustmentNotes(): Promise<AllTimeAdjustmentNote[]> {
  const [seasonAdjustments, historicAdjustments] = await Promise.all([
    prisma.pointsAdjustment.findMany({ select: { userId: true, points: true, reason: true } }),
    prisma.historicPointsAdjustment.findMany({ select: { userId: true, points: true, reason: true } }),
  ]);
  return [...seasonAdjustments, ...historicAdjustments];
}
