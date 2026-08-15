import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getPickContext, getPicksReveal, getRelevantGameweek } from "@/lib/picks";
import { getGameweekSummary } from "@/lib/gameweek-summary";
import { getJokerHalf } from "@/lib/jokers";
import { Countdown } from "@/components/countdown";
import { PickScreen } from "@/components/pick-screen";
import { PicksReveal } from "@/components/picks-reveal";
import { EditPickPanel } from "@/components/edit-pick-panel";
import { GameweekSummaryView } from "@/components/gameweek-summary";
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

  // Keep showing "you've picked" right up until kick-off, even after
  // picking closes — that's still the most useful thing for the viewer.
  // Once kick-off has passed, everyone (picked or not) drops into the
  // in-play recap below instead.
  if (context.alreadyPicked && context.myPick && !context.slipDeadlinePassed) {
    const pick = context.myPick;
    const picksSoFar = getPicksReveal(context.gameweek);
    const slipSubmitted = Boolean(pick.betSlip?.submittedAt);
    const jokerHalf = getJokerHalf(gameweek.pickDeadlineAt, gameweek.season.jokerSplitDate);
    return (
      <div className="space-y-4">
        {heading}
        <div className="card py-6">
          {context.phase === "OPEN" ? (
            <Countdown target={gameweek.pickDeadlineAt.toISOString()} label="Picks close in" />
          ) : (
            <Countdown target={gameweek.slipDeadlineAt.toISOString()} label="Kick-off in" />
          )}
        </div>
        <div className="card flex flex-col items-center gap-3 py-10 text-center">
          <p className="pill-green">You&apos;re in for this week</p>
          <TeamBadge name={pick.team.name} shortName={pick.team.shortName} crestUrl={pick.team.crestUrl} size="lg" />
          <p className="font-display text-3xl font-bold">You&apos;ve picked {pick.team.name}</p>
          {pick.isJoker && <p className="pill-amber">Joker played</p>}
        </div>
        {context.phase === "OPEN" ? (
          // Picks aren't locked yet — you can still change your mind about
          // the joker, and swap teams too once everyone else has picked.
          <EditPickPanel
            pickId={pick.id}
            currentTeamId={pick.team.id}
            currentTeamName={pick.team.name}
            currentTeamShortName={pick.team.shortName}
            currentTeamCrestUrl={pick.team.crestUrl}
            currentIsJoker={pick.isJoker}
            teamOptions={context.teamOptions}
            jokerAvailable={context.jokerAvailability.available}
            jokerHalfLabel={jokerHalf === "H1" ? "first half of the season" : "second half of the season"}
            canChangeTeam={context.everyonePicked}
          />
        ) : (
          // Picks are locked and it's counting down to kick-off — this is
          // when the bet slip (proof of the real bet) is actually needed.
          pick.betSlip && (
            <div className="card flex flex-col items-center gap-3 py-6 text-center">
              {slipSubmitted ? (
                <>
                  <p className="pill-green">Bet slip submitted</p>
                  <Link href={`/slip/${pick.betSlip.token}`} className="text-xs font-semibold text-muted hover:text-foreground">
                    Update your bet slip
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted">Don&apos;t forget to log proof of your actual bet.</p>
                  <Link href={`/slip/${pick.betSlip.token}`} className="btn-primary">
                    Submit your bet slip
                  </Link>
                </>
              )}
            </div>
          )
        )}
        <PicksReveal picks={picksSoFar} currentUserId={user.id} />
      </div>
    );
  }

  if (context.phase === "UPCOMING") {
    // Phase is derived from the clock (lib/gameweek-phase.ts), so this
    // branch structurally can't be entered once picksOpenAt has passed —
    // no more "stuck showing a broken 0 sec countdown" scenario.
    return (
      <div className="space-y-4">
        {heading}
        <div className="card py-10">
          <Countdown target={gameweek.picksOpenAt.toISOString()} label="Picks open in" />
        </div>
      </div>
    );
  }

  if (context.phase === "OPEN") {
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

  // Kick-off has passed — games are properly under way (or already
  // settled), and getRelevantGameweek only ever falls back to this
  // gameweek while no newer one exists, so this naturally gives way to the
  // countdown above the moment a new gameweek is created.
  if (context.slipDeadlinePassed || context.phase === "SETTLED") {
    const summary = await getGameweekSummary(gameweek.id);
    if (summary) {
      return (
        <div className="space-y-4">
          {heading}
          <GameweekSummaryView summary={summary} currentUserId={user.id} />
        </div>
      );
    }
  }

  return (
    <div className="space-y-4">
      {heading}
      <div className="card text-center">
        <p className="text-sm text-muted">Picks are closed for this gameweek — hang tight for kick-off.</p>
      </div>
    </div>
  );
}
