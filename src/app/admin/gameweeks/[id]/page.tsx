import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createFixture,
  deleteFixture,
  updateGameweekDeadlines,
  updateGameweekStatus,
} from "@/lib/actions/admin";
import { ErrorBanner, SuccessBanner } from "@/components/banners";
import { formatLondon, toLondonDatetimeLocal } from "@/lib/time";

const STATUSES = ["UPCOMING", "OPEN", "LOCKED", "SETTLED"] as const;

export default async function AdminGameweekDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const { error, success } = await searchParams;

  const gameweek = await prisma.gameweek.findUnique({
    where: { id },
    include: {
      season: true,
      fixtures: { include: { homeTeam: true, awayTeam: true }, orderBy: { createdAt: "asc" } },
      picks: { include: { user: true, team: true } },
    },
  });
  if (!gameweek) notFound();

  const teams = await prisma.team.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const usedTeamIds = new Set(gameweek.fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">
          {gameweek.season.name} — Gameweek {gameweek.weekNumber}
        </h1>
        <p className="text-sm text-muted">Status: {gameweek.status}</p>
      </div>
      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-muted">Status</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <form key={status} action={updateGameweekStatus}>
              <input type="hidden" name="gameweekId" value={gameweek.id} />
              <input type="hidden" name="status" value={status} />
              <button
                type="submit"
                disabled={gameweek.status === status}
                className={gameweek.status === status ? "btn-primary" : "btn-secondary"}
              >
                {status}
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-muted">Deadlines (Europe/London)</h2>
        <form action={updateGameweekDeadlines} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="gameweekId" value={gameweek.id} />
          <div>
            <label className="label" htmlFor="picksOpenAt">
              Picks open
            </label>
            <input
              id="picksOpenAt"
              name="picksOpenAt"
              type="datetime-local"
              className="input"
              defaultValue={toLondonDatetimeLocal(gameweek.picksOpenAt)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="pickDeadlineAt">
              Pick deadline
            </label>
            <input
              id="pickDeadlineAt"
              name="pickDeadlineAt"
              type="datetime-local"
              className="input"
              defaultValue={toLondonDatetimeLocal(gameweek.pickDeadlineAt)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="slipDeadlineAt">
              Slip deadline / kick-off
            </label>
            <input
              id="slipDeadlineAt"
              name="slipDeadlineAt"
              type="datetime-local"
              className="input"
              defaultValue={toLondonDatetimeLocal(gameweek.slipDeadlineAt)}
              required
            />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-secondary">
              Save deadlines
            </button>
          </div>
        </form>
      </section>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-muted">Fixtures ({gameweek.fixtures.length})</h2>
        <form action={createFixture} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="gameweekId" value={gameweek.id} />
          <div>
            <label className="label" htmlFor="homeTeamId">
              Home
            </label>
            <select id="homeTeamId" name="homeTeamId" className="input" required defaultValue="">
              <option value="" disabled>
                Choose team
              </option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {usedTeamIds.has(t.id) ? "(already in this GW)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="awayTeamId">
              Away
            </label>
            <select id="awayTeamId" name="awayTeamId" className="input" required defaultValue="">
              <option value="" disabled>
                Choose team
              </option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {usedTeamIds.has(t.id) ? "(already in this GW)" : ""}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary">
            Add fixture
          </button>
        </form>

        <div className="divide-y divide-border">
          {gameweek.fixtures.map((fixture) => (
            <div key={fixture.id} className="flex items-center justify-between gap-3 py-2.5">
              <p className="text-sm">
                {fixture.homeTeam.name}{" "}
                {fixture.homeScore !== null ? (
                  <span className="font-mono font-semibold">{fixture.homeScore}</span>
                ) : null}{" "}
                v{" "}
                {fixture.awayScore !== null ? (
                  <span className="font-mono font-semibold">{fixture.awayScore}</span>
                ) : null}{" "}
                {fixture.awayTeam.name}
              </p>
              <form action={deleteFixture}>
                <input type="hidden" name="fixtureId" value={fixture.id} />
                <input type="hidden" name="gameweekId" value={gameweek.id} />
                <button type="submit" className="text-xs text-danger hover:underline">
                  Remove
                </button>
              </form>
            </div>
          ))}
          {gameweek.fixtures.length === 0 && <p className="py-4 text-sm text-muted">No fixtures added yet.</p>}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-muted">Picks so far ({gameweek.picks.length})</h2>
        <div className="divide-y divide-border">
          {gameweek.picks.map((pick) => (
            <div key={pick.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span>
                {pick.user.name} → {pick.team.name} {pick.isJoker && <span className="pill-amber ml-1">Joker</span>}
              </span>
              <span className="text-xs text-muted">
                {pick.oddsFractional} ({pick.oddsDecimal.toFixed(2)}) · {formatLondon(pick.createdAt)}
              </span>
            </div>
          ))}
          {gameweek.picks.length === 0 && <p className="py-4 text-sm text-muted">No picks yet.</p>}
        </div>
      </section>
    </div>
  );
}
