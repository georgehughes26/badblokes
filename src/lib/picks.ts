import { prisma } from "@/lib/prisma";
import { isTeamOnCooldown } from "@/lib/cooldown";
import { getJokerAvailability, type JokerHalf, getJokerHalf } from "@/lib/jokers";
import { isWithinWindow } from "@/lib/time";

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
      picks: { include: { user: true, team: true } },
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
  windowOpen: boolean;
  /** Has picksOpenAt already passed? Lets the UI tell "still upcoming" apart from "stuck waiting on a manual status flip". */
  picksOpenAtPassed: boolean;
}

/** The gameweek a player should be looking at right now: the earliest OPEN one. */
export async function getCurrentOpenGameweek() {
  return prisma.gameweek.findFirst({
    where: { status: "OPEN" },
    orderBy: [{ season: { startDate: "desc" } }, { weekNumber: "asc" }],
    include: { season: true },
  });
}

/**
 * The gameweek the player's home screen should show right now: the OPEN one
 * if there is one, otherwise the soonest UPCOMING one (so we can still show
 * a "picks open in..." countdown before the window opens).
 */
export async function getRelevantGameweek() {
  const open = await getCurrentOpenGameweek();
  if (open) return open;
  return prisma.gameweek.findFirst({
    where: { status: "UPCOMING" },
    orderBy: [{ season: { startDate: "desc" } }, { weekNumber: "asc" }],
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
    const takenBy = gameweek.picks.find((p) => p.teamId === team.id);
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
  return {
    gameweek,
    alreadyPicked: Boolean(myPick),
    myPick,
    teamOptions,
    jokerAvailability,
    windowOpen: gameweek.status === "OPEN" && isWithinWindow(now, gameweek.picksOpenAt, gameweek.pickDeadlineAt),
    picksOpenAtPassed: now.getTime() >= gameweek.picksOpenAt.getTime(),
  };
}
