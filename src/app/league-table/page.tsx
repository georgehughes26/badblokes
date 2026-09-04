import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { computeStandings, getGotmBatches } from "@/lib/standings";
import { computeAllTimeStandings, getAllTimeAdjustmentNotes } from "@/lib/all-time";
import { TableSwitcher } from "@/components/table-switcher";

export default async function LeagueTablePage() {
  const user = await requireUser();
  const season = await prisma.season.findFirst({ where: { active: true } });

  if (!season) {
    return <p className="card text-center text-sm text-muted">No active season yet.</p>;
  }

  const [seasonRows, gotm, allTime, allTimeNotes, seasonAdjustments] = await Promise.all([
    computeStandings(season.id),
    getGotmBatches(season.id),
    computeAllTimeStandings(),
    getAllTimeAdjustmentNotes(),
    prisma.pointsAdjustment.findMany({ where: { seasonId: season.id }, select: { userId: true, points: true, reason: true } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">{season.name}</h1>
      <TableSwitcher
        season={seasonRows}
        seasonNotes={seasonAdjustments}
        gotmCurrent={gotm.current}
        gotmCompleted={gotm.completed}
        allTime={allTime}
        allTimeNotes={allTimeNotes}
        currentUserId={user.id}
      />
    </div>
  );
}
