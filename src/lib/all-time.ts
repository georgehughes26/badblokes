import { prisma } from "@/lib/prisma";

export interface AllTimeRow {
  userId: string;
  name: string;
  played: number;
  won: number;
  lost: number;
}

interface WinLoss {
  played: number;
  won: number;
  lost: number;
}

function emptyWinLoss(): WinLoss {
  return { played: 0, won: 0, lost: 0 };
}

function combine(a: WinLoss, b: WinLoss): WinLoss {
  return { played: a.played + b.played, won: a.won + b.won, lost: a.lost + b.lost };
}

/** Every Result row the app itself has ever recorded, across every season — not just the active one. */
async function getAppWideWinLoss(): Promise<Map<string, WinLoss>> {
  const results = await prisma.result.findMany({
    select: { userId: true, breachNoPick: true, breachTeamLost: true },
  });
  const map = new Map<string, WinLoss>();
  for (const r of results) {
    const row = map.get(r.userId) ?? emptyWinLoss();
    row.played += 1;
    // Same "played and lost" rule as computeStandings — a no-pick counts as
    // a loss too, not a non-event.
    if (r.breachNoPick || r.breachTeamLost) row.lost += 1;
    else row.won += 1;
    map.set(r.userId, row);
  }
  return map;
}

/** Final P/W/L from every pre-app season — hand-entered via HistoricStanding, not derived. */
async function getHistoricWinLoss(): Promise<Map<string, WinLoss>> {
  const standings = await prisma.historicStanding.findMany({
    select: { userId: true, played: true, won: true, lost: true },
  });
  const map = new Map<string, WinLoss>();
  for (const s of standings) {
    const row = map.get(s.userId) ?? emptyWinLoss();
    map.set(s.userId, combine(row, s));
  }
  return map;
}

/**
 * Every active player's career record — every app-tracked season's results
 * plus the hand-entered pre-app seasons — combined into one P/W/L ledger.
 * This is the All Time Table: ranked by total wins (not win %), because
 * pre-app wins were scored under that era's own convention (a joker win
 * counted as 2 wins with a loss undone, not a separate points value — see
 * HistoricStanding in schema.prisma), so `won` is each season's score,
 * not a literal count of gameweeks won.
 */
export async function computeAllTimeStandings(): Promise<AllTimeRow[]> {
  const [appWide, historic, activeUsers] = await Promise.all([
    getAppWideWinLoss(),
    getHistoricWinLoss(),
    prisma.user.findMany({ where: { active: true } }),
  ]);

  const rows: AllTimeRow[] = activeUsers.map((user) => ({
    userId: user.id,
    name: user.name,
    ...combine(appWide.get(user.id) ?? emptyWinLoss(), historic.get(user.id) ?? emptyWinLoss()),
  }));

  return rows.sort((a, b) => b.won - a.won || a.lost - b.lost || b.played - a.played || a.name.localeCompare(b.name));
}

/** One player's career P/W/L — the all-time half of the History page's profile header. */
export async function getUserAllTimeStats(userId: string): Promise<AllTimeRow | null> {
  const rows = await computeAllTimeStandings();
  return rows.find((r) => r.userId === userId) ?? null;
}
