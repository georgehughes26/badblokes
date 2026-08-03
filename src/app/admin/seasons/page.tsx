import { prisma } from "@/lib/prisma";
import { createSeason, setSeasonActive } from "@/lib/actions/admin";
import { ErrorBanner, SuccessBanner } from "@/components/banners";
import { formatLondon } from "@/lib/time";

export default async function AdminSeasonsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const seasons = await prisma.season.findMany({ orderBy: { startDate: "desc" } });

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold">Seasons</h1>
      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <form action={createSeason} className="card grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Season name
          </label>
          <input id="name" name="name" className="input" placeholder="2026/27" required />
        </div>
        <div />
        <div>
          <label className="label" htmlFor="startDate">
            Start date
          </label>
          <input id="startDate" name="startDate" type="date" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="endDate">
            End date
          </label>
          <input id="endDate" name="endDate" type="date" className="input" required />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="jokerSplitDate">
            Joker split date
          </label>
          <input id="jokerSplitDate" name="jokerSplitDate" type="date" className="input" required />
          <p className="mt-1 text-xs text-muted">
            Each player gets one joker to use before this date, and another for on/after it.
          </p>
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary">
            Create season
          </button>
        </div>
      </form>

      <div className="card divide-y divide-border p-0">
        {seasons.map((season) => (
          <div key={season.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">
                {season.name} {season.active && <span className="pill-green ml-1">Active</span>}
              </p>
              <p className="text-xs text-muted">
                {formatLondon(season.startDate, "d MMM yyyy")} – {formatLondon(season.endDate, "d MMM yyyy")} · Joker
                split {formatLondon(season.jokerSplitDate, "d MMM yyyy")}
              </p>
            </div>
            {!season.active && (
              <form action={setSeasonActive}>
                <input type="hidden" name="seasonId" value={season.id} />
                <button type="submit" className="btn-secondary !px-3 !py-1.5 text-xs">
                  Make active
                </button>
              </form>
            )}
          </div>
        ))}
        {seasons.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">No seasons yet.</p>}
      </div>
    </div>
  );
}
