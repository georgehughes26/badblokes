import { prisma } from "@/lib/prisma";
import { deriveGameweekPhase } from "@/lib/gameweek-phase";

export interface HistoryPickTeaser {
  teamName: string;
  teamShortName: string;
  teamCrestUrl: string | null;
  isJoker: boolean;
}

export interface HistoryGameweekRow {
  id: string;
  weekNumber: number;
  /** slipDeadlineAt — i.e. kick-off. */
  kickoffAt: Date;
  settled: boolean;
  /** The viewer's own pick that week, or null if they didn't pick. */
  myPick: HistoryPickTeaser | null;
  /** "Won" | "Won (EP)" | "Lost" | "No pick" — null until results are in. */
  myOutcomeLabel: string | null;
  /** The viewer's points that week — null until the gameweek is settled. */
  myPoints: number | null;
}

export interface HistorySeasonGroup {
  seasonId: string;
  seasonName: string;
  gameweeks: HistoryGameweekRow[];
}

/**
 * Every gameweek whose pick window has closed, newest first, grouped by
 * season — the backing data for the History page. Each row carries a teaser
 * of the viewer's own pick and result so the list answers "who did I pick
 * last week?" at a glance; clicking through to /history/:id shows the full
 * group summary via getGameweekSummary.
 */
export async function getGameweekHistory(userId: string): Promise<HistorySeasonGroup[]> {
  const now = new Date();
  const gameweeks = await prisma.gameweek.findMany({
    where: { pickDeadlineAt: { lt: now } },
    orderBy: [{ season: { startDate: "desc" } }, { weekNumber: "desc" }],
    include: {
      season: { select: { id: true, name: true } },
      picks: { where: { userId }, include: { team: true } },
      results: { where: { userId } },
    },
  });

  const groups = new Map<string, HistorySeasonGroup>();

  for (const gw of gameweeks) {
    const phase = deriveGameweekPhase(gw, now);
    if (phase !== "LOCKED" && phase !== "SETTLED") continue;

    const pick = gw.picks[0] ?? null;
    const result = gw.results[0] ?? null;

    let myOutcomeLabel: string | null = null;
    if (pick?.resultEnteredAt) {
      // Same combine rule as getGameweekSummary / settlePlayerGameweek: a
      // 2-up pick still counts as a win even if the team then drew or lost.
      myOutcomeLabel = pick.resultWon || pick.resultWentTwoUp ? (pick.resultWentTwoUp ? "Won (EP)" : "Won") : "Lost";
    } else if (!pick && result) {
      myOutcomeLabel = "No pick";
    }

    const row: HistoryGameweekRow = {
      id: gw.id,
      weekNumber: gw.weekNumber,
      kickoffAt: gw.slipDeadlineAt,
      settled: gw.status === "SETTLED",
      myPick: pick
        ? {
            teamName: pick.team.name,
            teamShortName: pick.team.shortName,
            teamCrestUrl: pick.team.crestUrl,
            isJoker: pick.isJoker,
          }
        : null,
      myOutcomeLabel,
      myPoints: result?.points ?? null,
    };

    let group = groups.get(gw.season.id);
    if (!group) {
      group = { seasonId: gw.season.id, seasonName: gw.season.name, gameweeks: [] };
      groups.set(gw.season.id, group);
    }
    group.gameweeks.push(row);
  }

  return [...groups.values()];
}
