import { requireUser } from "@/lib/auth/current-user";
import { getCurrentOpenGameweek, getPickContext } from "@/lib/picks";
import { getJokerHalf } from "@/lib/jokers";
import { formatLondon } from "@/lib/time";
import { PickScreen, type FixtureProp } from "@/components/pick-screen";

export default async function PickPage() {
  const user = await requireUser();
  const gameweek = await getCurrentOpenGameweek();

  if (!gameweek) {
    return (
      <div className="card">
        <h1 className="text-lg font-bold">Make a pick</h1>
        <p className="mt-2 text-sm text-muted">
          No gameweek is open for picks right now. Check back Friday at 12:00.
        </p>
      </div>
    );
  }

  const context = await getPickContext(user.id, gameweek.id);
  if (!context) {
    return (
      <div className="card">
        <p className="text-sm text-muted">That gameweek couldn&apos;t be found.</p>
      </div>
    );
  }

  if (context.alreadyPicked && context.myPick) {
    const pick = context.myPick;
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold">
          {gameweek.season.name} — Gameweek {gameweek.weekNumber}
        </h1>
        <div className="card space-y-2">
          <p className="pill-green w-fit">Pick locked in</p>
          <p className="text-lg font-semibold">{pick.team.name}</p>
          <p className="text-sm text-muted">
            Odds: {pick.oddsFractional} ({pick.oddsDecimal.toFixed(2)})
          </p>
          {pick.isJoker && <p className="pill-amber w-fit">Joker played</p>}
          <p className="text-xs text-muted">Picked {formatLondon(pick.createdAt)}</p>
          <p className="mt-2 text-sm text-muted">
            Picks are final — get your bet slip in before {formatLondon(gameweek.slipDeadlineAt)}.
          </p>
        </div>
      </div>
    );
  }

  if (!context.windowOpen) {
    return (
      <div className="card">
        <h1 className="text-lg font-bold">Make a pick</h1>
        <p className="mt-2 text-sm text-muted">
          Picks aren&apos;t open right now for {gameweek.season.name} — Gameweek {gameweek.weekNumber}.
        </p>
      </div>
    );
  }

  const fixtures: FixtureProp[] = context.fixtures.map((f) => ({
    fixtureId: f.id,
    kickoffAt: f.kickoffAt.toISOString(),
    home: {
      id: f.homeTeam.id,
      name: f.homeTeam.name,
      shortName: f.homeTeam.shortName,
      ...context.teamAvailability.get(f.homeTeam.id)!,
    },
    away: {
      id: f.awayTeam.id,
      name: f.awayTeam.name,
      shortName: f.awayTeam.shortName,
      ...context.teamAvailability.get(f.awayTeam.id)!,
    },
  }));

  const jokerHalf = getJokerHalf(gameweek.pickDeadlineAt, gameweek.season.jokerSplitDate);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">
          {gameweek.season.name} — Gameweek {gameweek.weekNumber}
        </h1>
        <p className="text-sm text-muted">
          Pick deadline {formatLondon(gameweek.pickDeadlineAt)} · Slip deadline {formatLondon(gameweek.slipDeadlineAt)}
        </p>
      </div>
      <PickScreen
        gameweekId={gameweek.id}
        fixtures={fixtures}
        jokerAvailable={context.jokerAvailability.available}
        jokerHalfLabel={jokerHalf === "H1" ? "first half of the season" : "second half of the season"}
        oddsMinDecimal={1.5}
      />
    </div>
  );
}
