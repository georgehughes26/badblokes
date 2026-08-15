import { prisma } from "@/lib/prisma";
import { isTeamOnCooldown } from "@/lib/cooldown";
import { getJokerAvailability, type JokerHalf, getJokerHalf } from "@/lib/jokers";
import { deriveGameweekPhase } from "@/lib/gameweek-phase";
import type { GameweekStatus } from "@prisma/client";

export interface TeamOption {
  id: string;
  name: string;
  shortName: string;
  crestUrl: string | null;
  division: string | null;
  available: boolean;
  reason: string | null;
}

function loadGameweek(gameweekId: string) {
  return prisma.gameweek.findUnique({
    where: { id: gameweekId },
    include: {
      season: true,
      picks: { include: { user: true, team: true, betSlip: true } },
    },
  });
}

type GameweekWithPicks = NonNullable<Awaited<ReturnType<typeof loadGameweek>>>;

export interface PickRevealRow {
  userId: string;
  userName: string;
  teamName: string;
  teamShortName: string;
  teamCrestUrl: string | null;
  isJoker: boolean;
  createdAt: Date;
}

/**
 * Every confirmed pick for a gameweek, oldest first — the "who's picked so
 * far" reveal shown once you've made your own pick. Never call this until
 * the viewer has already picked; that gate lives in the page, not here.
 */
export function getPicksReveal(gameweek: GameweekWithPicks): PickRevealRow[] {
  return [...gameweek.picks]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((p) => ({
      userId: p.userId,
      userName: p.user.name,
      teamName: p.team.name,
      teamShortName: p.team.shortName,
      teamCrestUrl: p.team.crestUrl,
      isJoker: p.isJoker,
      createdAt: p.createdAt,
    }));
}

export interface PickContext {
  gameweek: GameweekWithPicks;
  alreadyPicked: boolean;
  myPick: GameweekWithPicks["picks"][number] | null;
  teamOptions: TeamOption[];
  jokerAvailability: ReturnType<typeof getJokerAvailability>;
  /** The gameweek's live phase, derived from the clock — see lib/gameweek-phase.ts. */
  phase: GameweekStatus;
  /** Has slipDeadlineAt already passed? Gates the "submit your bet slip" CTA and countdown on the already-picked view. */
  slipDeadlinePassed: boolean;
  /** Has every active player picked? Gates the "change team" option once picking closes the info gap. */
  everyonePicked: boolean;
}

/**
 * The gameweek the player's home screen should show right now: whichever
 * unsettled gameweek is currently OPEN for picking, otherwise the soonest
 * still-UPCOMING one (so we can show a "picks open in..." countdown before
 * the window opens). Phase is derived from the clock, not a stored status —
 * nobody needs to manually "open" a gameweek for it to show up here.
 *
 * If neither exists (picks have closed and nothing new has been created
 * yet), falls back to the most recent gameweek overall — LOCKED mid-games
 * or already SETTLED — so the home page can show an in-play/recap view
 * instead of going blank. That fallback stops being reachable the instant a
 * newer gameweek exists, since it'll win one of the checks above.
 */
export async function getRelevantGameweek() {
  const now = new Date();
  const candidates = await prisma.gameweek.findMany({
    where: { status: { not: "SETTLED" } },
    orderBy: [{ season: { startDate: "desc" } }, { weekNumber: "asc" }],
    include: { season: true },
  });
  const open = candidates.find((gw) => deriveGameweekPhase(gw, now) === "OPEN");
  if (open) return open;
  const upcoming = candidates.find((gw) => deriveGameweekPhase(gw, now) === "UPCOMING");
  if (upcoming) return upcoming;

  return prisma.gameweek.findFirst({
    orderBy: [{ season: { startDate: "desc" } }, { weekNumber: "desc" }],
    include: { season: true },
  });
}

/** Every previous joker half a player has used in this season (locked-in picks only). */
export async function getPreviousJokerHalves(
  userId: string,
  seasonId: string,
  jokerSplitDate: Date,
  excludeGameweekId: string,
): Promise<JokerHalf[]> {
  const jokerPicks = await prisma.pick.findMany({
    where: { userId, isJoker: true, gameweekId: { not: excludeGameweekId }, gameweek: { seasonId } },
    include: { gameweek: true },
  });
  return jokerPicks.map((p) => getJokerHalf(p.gameweek.pickDeadlineAt, jokerSplitDate));
}

/**
 * Has every active player made a pick for this gameweek? Once true, nobody
 * gains an information edge from reshuffling — everyone's picks are
 * already public — so the "change team" option unlocks.
 */
export async function hasEveryonePicked(pickedUserIds: Set<string>): Promise<boolean> {
  const activePlayers = await prisma.user.findMany({ where: { active: true, role: "PLAYER" }, select: { id: true } });
  return activePlayers.every((p) => pickedUserIds.has(p.id));
}

/** The team the player picked in the immediately preceding gameweek of the same season, if any. */
export async function getPreviousGameweekPickTeamId(
  userId: string,
  seasonId: string,
  currentWeekNumber: number,
): Promise<string | null> {
  const previousGameweek = await prisma.gameweek.findFirst({
    where: { seasonId, weekNumber: { lt: currentWeekNumber } },
    orderBy: { weekNumber: "desc" },
  });
  if (!previousGameweek) return null;

  const previousPick = await prisma.pick.findUnique({
    where: { gameweekId_userId: { gameweekId: previousGameweek.id, userId } },
  });
  return previousPick?.teamId ?? null;
}

/** Everything the pick screen (and the API route that validates a submission) needs to know. */
export async function getPickContext(userId: string, gameweekId: string): Promise<PickContext | null> {
  const gameweek = await loadGameweek(gameweekId);
  if (!gameweek) return null;

  const myPick = gameweek.picks.find((p) => p.userId === userId) ?? null;
  // None of these three depend on each other's results — run them together
  // instead of paying three sequential cross-region round-trips.
  const [previousPickTeamId, previousJokerHalves, teams] = await Promise.all([
    getPreviousGameweekPickTeamId(userId, gameweek.seasonId, gameweek.weekNumber),
    getPreviousJokerHalves(userId, gameweek.seasonId, gameweek.season.jokerSplitDate, gameweekId),
    prisma.team.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  const jokerAvailability = getJokerAvailability(
    gameweek.pickDeadlineAt,
    gameweek.season.jokerSplitDate,
    previousJokerHalves,
  );

  const teamOptions: TeamOption[] = teams.map((team) => {
    // Your own current pick shouldn't show as "taken" — you're allowed to
    // browse (and, once everyone's picked, reselect) it.
    const takenBy = gameweek.picks.find((p) => p.teamId === team.id && p.userId !== userId);
    if (takenBy) {
      return {
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        crestUrl: team.crestUrl,
        division: team.division,
        available: false,
        reason: `Taken by ${takenBy.user.name}`,
      };
    }
    if (isTeamOnCooldown(previousPickTeamId, team.id)) {
      return {
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        crestUrl: team.crestUrl,
        division: team.division,
        available: false,
        reason: "You picked this team last gameweek",
      };
    }
    return {
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      crestUrl: team.crestUrl,
      division: team.division,
      available: true,
      reason: null,
    };
  });

  const now = new Date();
  const pickedUserIds = new Set(gameweek.picks.map((p) => p.userId));
  const everyonePicked = await hasEveryonePicked(pickedUserIds);
  return {
    gameweek,
    alreadyPicked: Boolean(myPick),
    myPick,
    teamOptions,
    jokerAvailability,
    phase: deriveGameweekPhase(gameweek, now),
    slipDeadlinePassed: now.getTime() >= gameweek.slipDeadlineAt.getTime(),
    everyonePicked,
  };
}
