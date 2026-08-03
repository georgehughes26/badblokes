import Link from "next/link";
import { prisma } from "@/lib/prisma";

const STATUS_PILL: Record<string, string> = {
  UPCOMING: "pill-muted",
  OPEN: "pill-green",
  LOCKED: "pill-amber",
  SETTLED: "pill-muted",
};

export default async function AdminResultsListPage() {
  const gameweeks = await prisma.gameweek.findMany({
    include: { season: true, _count: { select: { picks: true } } },
    orderBy: [{ season: { startDate: "desc" } }, { weekNumber: "desc" }],
  });

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold">Results</h1>
      <div className="card divide-y divide-border p-0">
        {gameweeks.map((gw) => (
          <Link
            key={gw.id}
            href={`/admin/results/${gw.id}`}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-raised"
          >
            <div>
              <p className="text-sm font-semibold">
                {gw.season.name} — GW{gw.weekNumber}
              </p>
              <p className="text-xs text-muted">{gw._count.picks} picks</p>
            </div>
            <span className={STATUS_PILL[gw.status]}>{gw.status}</span>
          </Link>
        ))}
        {gameweeks.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">No gameweeks yet.</p>}
      </div>
    </div>
  );
}
