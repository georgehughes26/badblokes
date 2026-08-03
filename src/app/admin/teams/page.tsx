import { prisma } from "@/lib/prisma";
import { createTeam, setTeamActive, syncTeamsFromOpenFootball } from "@/lib/actions/admin";
import { ErrorBanner, SuccessBanner } from "@/components/banners";

export default async function AdminTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold">Teams</h1>
        <form action={syncTeamsFromOpenFootball}>
          <button type="submit" className="btn-secondary !px-3 !py-1.5 text-xs">
            Sync Premier League → League Two from openfootball
          </button>
        </form>
      </div>
      <p className="-mt-3 text-xs text-muted">
        Pulls team lists from the free openfootball dataset (tiers 1-4). National League and anything else still go
        through the form below.
      </p>
      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <form action={createTeam} className="card grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end">
        <div>
          <label className="label" htmlFor="name">
            Team name
          </label>
          <input id="name" name="name" className="input" placeholder="Arsenal" required />
        </div>
        <div>
          <label className="label" htmlFor="shortName">
            Short
          </label>
          <input id="shortName" name="shortName" className="input" placeholder="ARS" required maxLength={5} />
        </div>
        <div>
          <label className="label" htmlFor="crestUrl">
            Crest URL (optional)
          </label>
          <input id="crestUrl" name="crestUrl" className="input" placeholder="https://…" />
        </div>
        <button type="submit" className="btn-primary">
          Add team
        </button>
      </form>

      <div className="card divide-y divide-border p-0">
        {teams.map((team) => (
          <div key={team.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised text-xs font-bold text-muted">
                {team.shortName}
              </span>
              <span className="text-sm font-medium">{team.name}</span>
              {team.division && <span className="pill-muted">{team.division}</span>}
              {!team.active && <span className="pill-muted">Inactive</span>}
            </div>
            <form action={setTeamActive}>
              <input type="hidden" name="teamId" value={team.id} />
              <input type="hidden" name="active" value={(!team.active).toString()} />
              <button type="submit" className="btn-secondary !px-3 !py-1.5 text-xs">
                {team.active ? "Deactivate" : "Activate"}
              </button>
            </form>
          </div>
        ))}
        {teams.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">No teams yet.</p>}
      </div>
    </div>
  );
}
