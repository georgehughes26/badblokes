import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ResultsEntryForm } from "@/components/results-entry-form";
import { getCurrentGameweekPhase } from "@/lib/gameweek-phase";

export default async function AdminResultsEntryPage({ params }: { params: Promise<{ gameweekId: string }> }) {
  const { gameweekId } = await params;

  const gameweek = await prisma.gameweek.findUnique({
    where: { id: gameweekId },
    include: {
      season: true,
      picks: { include: { user: true, team: true, betSlip: true }, orderBy: { createdAt: "asc" } },
      noPickSlips: true,
      results: true,
    },
  });
  if (!gameweek) notFound();

  const allActivePlayers = await prisma.user.findMany({ where: { active: true, role: "PLAYER" } });
  const pickedUserIds = new Set(gameweek.picks.map((p) => p.userId));
  const noPickSlipByUser = new Map(gameweek.noPickSlips.map((s) => [s.userId, s]));
  const resultByUser = new Map(gameweek.results.map((r) => [r.userId, r]));
  const noPickPlayers = allActivePlayers
    .filter((u) => !pickedUserIds.has(u.id))
    .map((u) => {
      const slip = noPickSlipByUser.get(u.id);
      const priorResult = resultByUser.get(u.id);
      return {
        userId: u.id,
        userName: u.name,
        slipUrl: slip?.externalUrl ?? null,
        slipSubmitted: Boolean(slip?.submittedAt),
        // Prefer whatever the admin already decided last time; otherwise
        // default to "voided" if a slip was submitted, since that's almost
        // always the right call.
        voided: priorResult ? priorResult.voided : Boolean(slip?.submittedAt),
      };
    });

  const picks = gameweek.picks.map((pick) => ({
    pickId: pick.id,
    userId: pick.userId,
    userName: pick.user.name,
    teamName: pick.team.name,
    isJoker: pick.isJoker,
    slipSubmitted: Boolean(pick.betSlip?.submittedAt),
    slipUrl: pick.betSlip?.externalUrl ?? null,
    won: pick.resultWon ?? false,
    wentTwoUp: pick.resultWentTwoUp ?? false,
    shortOdds: pick.resultShortOdds ?? false,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">
          {gameweek.season.name} — Gameweek {gameweek.weekNumber} results
        </h1>
        <p className="text-sm text-muted">Status: {getCurrentGameweekPhase(gameweek)}</p>
      </div>
      <ResultsEntryForm
        gameweekId={gameweek.id}
        picks={picks}
        noPickPlayers={noPickPlayers}
        alreadySettled={gameweek.status === "SETTLED"}
      />
    </div>
  );
}
