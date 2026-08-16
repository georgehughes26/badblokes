import { prisma } from "@/lib/prisma";

export interface GameweekSummaryRow {
  userId: string;
  userName: string;
  hasPick: boolean;
  teamName: string | null;
  teamShortName: string | null;
  teamCrestUrl: string | null;
  isJoker: boolean;
  pickedAt: Date | null;
  /** null until the gameweek is settled. */
  outcomeLabel: string | null;
  points: number | null;
  fineAmount: number | null;
}

export interface GameweekSummary {
  settled: boolean;
  rows: GameweekSummaryRow[];
  winnersCount: number;
  totalFines: number;
}

/**
 * Everyone's picks — and, once settled, everyone's results — for a
 * gameweek whose pick window has closed. This is the "in play" recap shown
 * on the home page once kick-off has passed and there's no newer gameweek
 * to show instead. Before settlement there's no reliable way to know who
 * didn't pick at all (that only becomes a Result row at settlement time),
 * so the roster is picks-only until then.
 */
export async function getGameweekSummary(gameweekId: string): Promise<GameweekSummary | null> {
  const gameweek = await prisma.gameweek.findUnique({
    where: { id: gameweekId },
    include: {
      picks: { include: { user: true, team: true } },
      results: true,
    },
  });
  if (!gameweek) return null;

  const settled = gameweek.status === "SETTLED";
  const rows = new Map<string, GameweekSummaryRow>();

  if (settled) {
    const activePlayers = await prisma.user.findMany({ where: { active: true, role: "PLAYER" } });
    for (const p of activePlayers) {
      rows.set(p.id, {
        userId: p.id,
        userName: p.name,
        hasPick: false,
        teamName: null,
        teamShortName: null,
        teamCrestUrl: null,
        isJoker: false,
        pickedAt: null,
        outcomeLabel: null,
        points: null,
        fineAmount: null,
      });
    }
  }

  for (const pick of gameweek.picks) {
    rows.set(pick.userId, {
      userId: pick.userId,
      userName: pick.user.name,
      hasPick: true,
      teamName: pick.team.name,
      teamShortName: pick.team.shortName,
      teamCrestUrl: pick.team.crestUrl,
      isJoker: pick.isJoker,
      pickedAt: pick.createdAt,
      // "Won" and "went 2 up" are independent admin-entered facts (a team can
      // go 2 up and then draw or lose outright and it still counts as a win
      // — see rules.ts) — combine them the same way settlePlayerGameweek
      // does, or a 2-up-only pick would score points as a win but display
      // as "Lost".
      outcomeLabel: pick.resultEnteredAt
        ? pick.resultWon || pick.resultWentTwoUp
          ? pick.resultWentTwoUp
            ? "Won (EP)"
            : "Won"
          : "Lost"
        : null,
      points: null,
      fineAmount: null,
    });
  }

  // Layer the real numbers on top from Result — the only place points/fines
  // live. Covers no-pick players too (they only exist here, never in picks).
  for (const result of gameweek.results) {
    const existing = rows.get(result.userId);
    if (existing) {
      existing.points = result.points;
      existing.fineAmount = result.fineAmount;
      if (!existing.hasPick) existing.outcomeLabel = "No pick";
    } else {
      rows.set(result.userId, {
        userId: result.userId,
        userName: "?",
        hasPick: false,
        teamName: null,
        teamShortName: null,
        teamCrestUrl: null,
        isJoker: false,
        pickedAt: null,
        outcomeLabel: "No pick",
        points: result.points,
        fineAmount: result.fineAmount,
      });
    }
  }

  const sorted = [...rows.values()].sort((a, b) => {
    if (settled) return (b.points ?? -Infinity) - (a.points ?? -Infinity);
    return (a.pickedAt?.getTime() ?? 0) - (b.pickedAt?.getTime() ?? 0);
  });

  const winnersCount = sorted.filter((r) => r.outcomeLabel === "Won" || r.outcomeLabel === "Won (EP)").length;
  const totalFines = gameweek.results.reduce((sum, r) => sum + r.fineAmount, 0);

  return { settled, rows: sorted, winnersCount, totalFines };
}
