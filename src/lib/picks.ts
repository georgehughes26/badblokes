import { prisma } from "@/lib/prisma";
import { isTeamOnCooldown } from "@/lib/cooldown";
import { getJokerAvailability, type JokerHalf, getJokerHalf } from "@/lib/jokers";
import { isWithinWindow } from "@/lib/time";

export interface TeamAvailability {
  teamId: string;
  available: boolean;
  reason: string | null;
}

function loadGameweekWithFixtures(gameweekId: string) {
  return prisma.gameweek.findUnique({
    where: { id: gameweekId },
    include: {
      season: true,
      fixtures: { include: { homeTeam: true, awayTeam: true }, orderBy: { kickoffAt: "asc" } },
      picks: { include: { user: true, team: true } },
    },
  });
}

type GameweekWithFixtures = NonNullable<Awaited<ReturnType<typeof loadGameweekWithFixtures>>>;

export interface PickContext {
  gameweek: GameweekWithFixtures;
  fixtures: GameweekWithFixtures["fixtures"];
  alreadyPicked: boolean;
  myPick: GameweekWithFixtures["picks"][number] | null;
  teamAvailability: Map<string, TeamAvailability>;
  jokerAvailability: ReturnType<typeof getJokerAvailability>;
  windowOpen: boolean;
}

/** The gameweek a player should be looking at right now: the earliest OPEN one. */
export async function getCurrentOpenGameweek() {
  return prisma.gameweek.findFirst({
    where: { status: "OPEN" },
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
  const gameweek = await loadGameweekWithFixtures(gameweekId);
  if (!gameweek) return null;

  const myPick = gameweek.picks.find((p) => p.userId === userId) ?? null;
  const previousPickTeamId = await getPreviousGameweekPickTeamId(userId, gameweek.seasonId, gameweek.weekNumber);
  const previousJokerHalves = await getPreviousJokerHalves(
    userId,
    gameweek.seasonId,
    gameweek.season.jokerSplitDate,
    gameweekId,
  );
  const jokerAvailability = getJokerAvailability(
    gameweek.pickDeadlineAt,
    gameweek.season.jokerSplitDate,
    previousJokerHalves,
  );

  const teamAvailability = new Map<string, TeamAvailability>();
  for (const fixture of gameweek.fixtures) {
    for (const team of [fixture.homeTeam, fixture.awayTeam]) {
      const takenBy = gameweek.picks.find((p) => p.teamId === team.id);
      if (takenBy) {
        teamAvailability.set(team.id, {
          teamId: team.id,
          available: false,
          reason: `Taken by ${takenBy.user.name}`,
        });
        continue;
      }
      if (isTeamOnCooldown(previousPickTeamId, team.id)) {
        teamAvailability.set(team.id, {
          teamId: team.id,
          available: false,
          reason: "You picked this team last gameweek",
        });
        continue;
      }
      teamAvailability.set(team.id, { teamId: team.id, available: true, reason: null });
    }
  }

  return {
    gameweek,
    fixtures: gameweek.fixtures,
    alreadyPicked: Boolean(myPick),
    myPick,
    teamAvailability,
    jokerAvailability,
    windowOpen:
      gameweek.status === "OPEN" && isWithinWindow(new Date(), gameweek.picksOpenAt, gameweek.pickDeadlineAt),
  };
}
