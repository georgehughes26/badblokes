import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createGameweek } from "@/lib/actions/admin";
import { ErrorBanner, SuccessBanner } from "@/components/banners";
import { formatLondon } from "@/lib/time";

const STATUS_PILL: Record<string, string> = {
  UPCOMING: "pill-muted",
  OPEN: "pill-green",
  LOCKED: "pill-amber",
  SETTLED: "pill-muted",
};

export default async function AdminGameweeksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const seasons = await prisma.season.findMany({ orderBy: { startDate: "desc" } });
  const gameweeks = await prisma.gameweek.findMany({
    include: { season: true, _count: { select: { picks: true } } },
    orderBy: [{ season: { startDate: "desc" } }, { weekNumber: "asc" }],
  });

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold">Gameweeks</h1>
      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <form action={createGameweek} className="card grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end">
        <div>
          <label className="label" htmlFor="seasonId">
            Season
          </label>
          <select id="seasonId" name="seasonId" className="input" required defaultValue="">
            <option value="" disabled>
              Choose a season
            </option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="weekNumber">
            Week #
          </label>
          <input id="weekNumber" name="weekNumber" type="number" min={1} className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="saturdayDate">
            Saturday kick-off date
          </label>
          <input id="saturdayDate" name="saturdayDate" type="date" className="input" required />
        </div>
        <button type="submit" className="btn-primary">
          Create
        </button>
      </form>
      <p className="-mt-3 text-xs text-muted">
        Deadlines are set automatically: picks open the Friday before at 12:00, the pick deadline is that Friday
        23:59, and the slip deadline / kick-off is 15:00 that Saturday — all Europe/London.
      </p>

      <div className="card divide-y divide-border p-0">
        {gameweeks.map((gw) => (
          <Link
            key={gw.id}
            href={`/admin/gameweeks/${gw.id}`}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-raised"
          >
            <div>
              <p className="text-sm font-semibold">
                {gw.season.name} — GW{gw.weekNumber}
              </p>
              <p className="text-xs text-muted">
                Kick-off {formatLondon(gw.slipDeadlineAt)} · {gw._count.picks} picks
              </p>
            </div>
            <span className={STATUS_PILL[gw.status]}>{gw.status}</span>
          </Link>
        ))}
        {gameweeks.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">No gameweeks yet.</p>}
      </div>
    </div>
  );
}
