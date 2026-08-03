import { requireUser } from "@/lib/auth/current-user";
import { getPickContext, getRelevantGameweek } from "@/lib/picks";
import { getJokerHalf } from "@/lib/jokers";
import { Countdown } from "@/components/countdown";
import { PickScreen } from "@/components/pick-screen";
import { TeamBadge } from "@/components/team-badge";

export default async function HomePage() {
  const user = await requireUser();
  const gameweek = await getRelevantGameweek();

  if (!gameweek) {
    return (
      <div className="card text-center">
        <h1 className="text-lg font-bold">Alright, {user.name.split(" ")[0]}.</h1>
        <p className="mt-2 text-sm text-muted">No gameweek is scheduled yet — check back soon.</p>
      </div>
    );
  }

  const context = await getPickContext(user.id, gameweek.id);
  if (!context) {
    return (
      <div className="card text-center">
        <p className="text-sm text-muted">Something went wrong loading this gameweek.</p>
      </div>
    );
  }

  const heading = (
    <p className="text-center text-sm text-muted">
      {gameweek.season.name} — Gameweek {gameweek.weekNumber}
    </p>
  );

  if (context.alreadyPicked && context.myPick) {
    const pick = context.myPick;
    return (
      <div className="space-y-4">
        {heading}
        <div className="card flex flex-col items-center gap-3 py-8 text-center">
          <p className="pill-green">You&apos;re in for this week</p>
          <TeamBadge name={pick.team.name} shortName={pick.team.shortName} crestUrl={pick.team.crestUrl} size="lg" />
          <p className="text-xl font-bold">You&apos;ve picked {pick.team.name}</p>
          <p className="text-sm text-muted">
            Odds {pick.oddsFractional} ({pick.oddsDecimal.toFixed(2)})
          </p>
          {pick.isJoker && <p className="pill-amber">Joker played</p>}
        </div>
      </div>
    );
  }

  if (gameweek.status === "UPCOMING") {
    return (
      <div className="space-y-4">
        {heading}
        <div className="card py-10">
          <Countdown target={gameweek.picksOpenAt.toISOString()} label="Picks open in" />
        </div>
      </div>
    );
  }

  if (gameweek.status === "OPEN" && context.windowOpen) {
    const jokerHalf = getJokerHalf(gameweek.pickDeadlineAt, gameweek.season.jokerSplitDate);
    return (
      <div className="space-y-4">
        {heading}
        <div className="card py-6">
          <Countdown target={gameweek.pickDeadlineAt.toISOString()} label="Picks close in" />
        </div>
        <PickScreen
          gameweekId={gameweek.id}
          teamOptions={context.teamOptions}
          jokerAvailable={context.jokerAvailability.available}
          jokerHalfLabel={jokerHalf === "H1" ? "first half of the season" : "second half of the season"}
          oddsMinDecimal={1.5}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {heading}
      <div className="card text-center">
        <p className="text-sm text-muted">Picks are closed for this gameweek — hang tight for results.</p>
      </div>
    </div>
  );
}
