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
    },
  });
  if (!gameweek) notFound();

  const allActivePlayers = await prisma.user.findMany({ where: { active: true, role: "PLAYER" } });
  const pickedUserIds = new Set(gameweek.picks.map((p) => p.userId));
  const noPickPlayers = allActivePlayers
    .filter((u) => !pickedUserIds.has(u.id))
    .map((u) => ({ userId: u.id, userName: u.name }));

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
