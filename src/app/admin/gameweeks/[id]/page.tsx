import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateGameweekDeadlines, updateGameweekStatus } from "@/lib/actions/admin";
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
      picks: { include: { user: true, team: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!gameweek) notFound();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">
            {gameweek.season.name} — Gameweek {gameweek.weekNumber}
          </h1>
          <p className="text-sm text-muted">Status: {gameweek.status}</p>
        </div>
        <Link href={`/admin/results/${gameweek.id}`} className="btn-primary">
          Enter results
        </Link>
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
        <h2 className="text-sm font-semibold text-muted">Picks so far ({gameweek.picks.length})</h2>
        <div className="divide-y divide-border">
          {gameweek.picks.map((pick) => (
            <div key={pick.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span>
                {pick.user.name} → {pick.team.name} {pick.isJoker && <span className="pill-amber ml-1">Joker</span>}
              </span>
              <span className="text-xs text-muted">
                {pick.oddsFractional} ({pick.oddsDecimal.toFixed(2)}) · {formatLondon(pick.createdAt)}
                {pick.resultEnteredAt && (
                  <span className="pill-green ml-2">{pick.resultWon ? (pick.resultWentTwoUp ? "Won (EP)" : "Won") : "Lost"}</span>
                )}
              </span>
            </div>
          ))}
          {gameweek.picks.length === 0 && <p className="py-4 text-sm text-muted">No picks yet.</p>}
        </div>
      </section>
    </div>
  );
}
