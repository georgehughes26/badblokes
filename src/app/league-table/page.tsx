import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { computeStandings, getGotmBatches } from "@/lib/standings";
import { computeAllTimeStandings, getAllTimeAdjustmentNotes } from "@/lib/all-time";
import { getBatchLedgers, getSeasonFineTotals, withDoubledFines, withSeasonFineTotals } from "@/lib/batch-settlement";
import { TableSwitcher } from "@/components/table-switcher";

export default async function LeagueTablePage() {
  const user = await requireUser();
  const season = await prisma.season.findFirst({ where: { active: true } });

  if (!season) {
    return <p className="card text-center text-sm text-muted">No active season yet.</p>;
  }

  const [seasonRows, gotm, allTime, allTimeNotes, seasonAdjustments, seasonFineTotals, batchLedgers] = await Promise.all([
    computeStandings(season.id),
    getGotmBatches(season.id),
    computeAllTimeStandings(),
    getAllTimeAdjustmentNotes(),
    prisma.pointsAdjustment.findMany({ where: { seasonId: season.id }, select: { userId: true, points: true, reason: true } }),
    getSeasonFineTotals(season.id),
    getBatchLedgers(season.id),
  ]);

  // Fines columns are sourced from Result.fineAmount, which never reflects
  // late-payment doubling — swap in the doubled-where-late figures for
  // display, same as the Wall of shame. Sort order (already settled above) is untouched.
  const seasonRowsDisplay = withSeasonFineTotals(seasonRows, seasonFineTotals);
  const gotmCurrentDisplay = { ...gotm.current, rows: withDoubledFines(gotm.current.rows, batchLedgers.current.rows) };
  const gotmCompletedDisplay = gotm.completed.map((batch) => {
    const ledger = batchLedgers.completed.find((l) => l.batchNumber === batch.batchNumber);
    return ledger ? { ...batch, rows: withDoubledFines(batch.rows, ledger.rows) } : batch;
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">{season.name}</h1>
      <TableSwitcher
        season={seasonRowsDisplay}
        seasonNotes={seasonAdjustments}
        gotmCurrent={gotmCurrentDisplay}
        gotmCompleted={gotmCompletedDisplay}
        allTime={allTime}
        allTimeNotes={allTimeNotes}
        currentUserId={user.id}
      />
    </div>
  );
}
