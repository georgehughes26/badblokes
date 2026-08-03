import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getPickContext, getPicksReveal, getRelevantGameweek } from "@/lib/picks";
import { getJokerHalf } from "@/lib/jokers";
import { Countdown } from "@/components/countdown";
import { PickScreen } from "@/components/pick-screen";
import { PicksReveal } from "@/components/picks-reveal";
import { TeamBadge } from "@/components/team-badge";

export default async function HomePage() {
  const user = await requireUser();
  const gameweek = await getRelevantGameweek();

  if (!gameweek) {
    return (
      <div className="card text-center">
        <h1 className="font-display text-2xl font-bold">Alright, {user.name.split(" ")[0]}.</h1>
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
    const picksSoFar = getPicksReveal(context.gameweek);
    return (
      <div className="space-y-4">
        {heading}
        <div className="card flex flex-col items-center gap-3 py-10 text-center">
          <p className="pill-green">You&apos;re in for this week</p>
          <TeamBadge name={pick.team.name} shortName={pick.team.shortName} crestUrl={pick.team.crestUrl} size="lg" />
          <p className="font-display text-3xl font-bold">You&apos;ve picked {pick.team.name}</p>
          {pick.isJoker && <p className="pill-amber">Joker played</p>}
        </div>
        <PicksReveal picks={picksSoFar} currentUserId={user.id} />
      </div>
    );
  }

  if (gameweek.status === "UPCOMING") {
    // Status is a separate, manually-set field — editing the deadlines
    // doesn't flip it. If picksOpenAt has already passed, a countdown to it
    // would just show a broken "0 sec" forever, so surface what's actually
    // going on instead.
    return (
      <div className="space-y-4">
        {heading}
        {context.picksOpenAtPassed ? (
          <div className="card space-y-3 py-10 text-center">
            <p className="text-sm text-muted">
              Picks were due to open — this gameweek just needs switching to &quot;Open&quot;.
            </p>
            {user.role === "ADMIN" && (
              <Link href={`/admin/gameweeks/${gameweek.id}`} className="btn-primary inline-flex">
                Open this gameweek
              </Link>
            )}
          </div>
        ) : (
          <div className="card py-10">
            <Countdown target={gameweek.picksOpenAt.toISOString()} label="Picks open in" />
          </div>
        )}
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
