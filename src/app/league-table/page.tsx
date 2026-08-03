import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { computeStandings, getRecentSettledGameweekIds } from "@/lib/standings";
import { TableSwitcher } from "@/components/table-switcher";

export default async function LeagueTablePage() {
  const user = await requireUser();
  const season = await prisma.season.findFirst({ where: { active: true } });

  if (!season) {
    return <p className="card text-center text-sm text-muted">No active season yet.</p>;
  }

  const [seasonRows, recentGameweekIds] = await Promise.all([
    computeStandings(season.id),
    getRecentSettledGameweekIds(season.id),
  ]);
  const gotmRows = await computeStandings(season.id, recentGameweekIds);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">{season.name}</h1>
      <TableSwitcher season={seasonRows} gotm={gotmRows} currentUserId={user.id} />
    </div>
  );
}
