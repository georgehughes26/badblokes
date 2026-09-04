import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getGameweekSummary } from "@/lib/gameweek-summary";
import { getCurrentGameweekPhase } from "@/lib/gameweek-phase";
import { GameweekSummaryView } from "@/components/gameweek-summary";

export default async function HistoryGameweekPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const gameweek = await prisma.gameweek.findUnique({
    where: { id },
    include: { season: { select: { name: true } } },
  });
  if (!gameweek) notFound();

  // History only covers gameweeks whose pick window has already closed —
  // anything still open belongs on the dashboard, not here.
  const phase = getCurrentGameweekPhase(gameweek);
  if (phase !== "LOCKED" && phase !== "SETTLED") notFound();

  const summary = await getGameweekSummary(gameweek.id);
  if (!summary) notFound();

  return (
    <div className="space-y-4">
      <Link href="/history" className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground">
        <span aria-hidden>&larr;</span> History
      </Link>
      <p className="text-center text-sm text-muted">
        {gameweek.season.name} — Gameweek {gameweek.weekNumber}
      </p>
      <GameweekSummaryView summary={summary} currentUserId={user.id} />
    </div>
  );
}
