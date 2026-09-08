import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getBatchLedgers, getPlayerBatchDues } from "@/lib/batch-settlement";
import { formatWinners } from "@/lib/standings";
import { formatLondon } from "@/lib/time";

export default async function FinesPage() {
  const user = await requireUser();
  const season = await prisma.season.findFirst({ where: { active: true } });

  const [{ current, completed }, myDues, allTimeByUser] = await Promise.all([
    season ? getBatchLedgers(season.id) : Promise.resolve({ current: null, completed: [] as never[] }),
    season ? getPlayerBatchDues(season.id, user.id) : Promise.resolve([]),
    prisma.fineLedgerEntry.groupBy({ by: ["userId"], _sum: { amount: true } }),
  ]);

  const ledgers = [...completed, ...(current ? [current] : [])];

  const myStakeOwed = myDues.filter((d) => !d.stakePaid).reduce((s, d) => s + d.stake, 0);
  const myFinesOwed = myDues.filter((d) => !d.finesPaid).reduce((s, d) => s + d.finesOwed, 0);
  const myOwed = myStakeOwed + myFinesOwed;

  // Earliest deadline attached to something I still owe.
  const myDeadlines: Date[] = [];
  for (const d of myDues) {
    if (!d.stakePaid && d.stakeDeadline) myDeadlines.push(d.stakeDeadline);
    if (!d.finesPaid && d.finesOwed > 0 && d.finesDeadline) myDeadlines.push(d.finesDeadline);
  }
  const payBy = myDeadlines.sort((a, b) => a.getTime() - b.getTime())[0];
  const payByOverdue = Boolean(payBy) && payBy.getTime() < new Date().getTime();
  const payByLabel = payBy
    ? payByOverdue
      ? `Overdue since ${formatLondon(payBy, "EEE d MMM")}`
      : `Pay by ${formatLondon(payBy, "EEE d MMM")}`
    : "Deadline set once the next gameweek is scheduled";

  const potTotal = ledgers.reduce(
    (sum, l) => sum + l.rows.filter((r) => !r.finesPaid).reduce((s, r) => s + r.finesOwed, 0),
    0,
  );

  const users = await prisma.user.findMany({
    where: { id: { in: allTimeByUser.map((r) => r.userId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  const topContributors = allTimeByUser
    .map((r) => ({ userId: r.userId, name: nameById.get(r.userId) ?? "?", total: r._sum.amount ?? 0 }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">The Pot</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">You owe</p>
          <p className="font-display text-5xl font-bold text-danger">£{myOwed}</p>
          {myOwed > 0 && (
            <p className={`text-xs ${payByOverdue ? "font-semibold text-danger" : "text-muted"}`}>{payByLabel}</p>
          )}
          {myOwed === 0 && <p className="text-xs text-muted">All square. Nice.</p>}

          {myDues.some((d) => !d.stakePaid || !d.finesPaid) && (
            <div className="mt-3 divide-y divide-border border-t border-border pt-2">
              {myDues.map((d) => {
                const bits: string[] = [];
                if (!d.stakePaid) bits.push(`£${d.stake} GOTM stake`);
                if (!d.finesPaid && d.finesOwed > 0) {
                  bits.push(`£${d.finesOwed} fines${d.finesLate ? " (doubled — late)" : ""}`);
                }
                if (bits.length === 0) return null;
                return (
                  <div key={d.batchNumber} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="text-muted">
                      GOTM {d.batchNumber} <span className="text-xs">({d.weekRangeLabel})</span>
                    </span>
                    <span className="text-right text-xs font-semibold text-danger">{bits.join(" + ")}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Current pot</p>
          <p className="font-display text-5xl font-bold text-accent">£{potTotal}</p>
          <p className="mt-2 text-xs text-muted">Unpaid fines across the group (late ones counted double)</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Gambler of the Month pot</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ledgers.map((l) => {
            const mine = l.rows.find((r) => r.userId === user.id);
            return (
              <Link
                key={l.batchNumber}
                href={`/fines/gotm/${l.batchNumber}`}
                className="card space-y-2 transition-colors hover:border-accent/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-base font-bold">
                    GOTM {l.batchNumber} <span className="font-normal text-muted">— {l.weekRangeLabel}</span>
                  </span>
                  {l.complete ? <span className="pill-green">Done</span> : <span className="pill-amber">Live</span>}
                </div>
                <p className="text-xs text-muted">
                  Pot £{l.gotmPotTotal} → {l.complete ? formatWinners(l.winnerNames) : "winner TBD"}
                  {l.complete && l.paidOut && " · paid out"}
                </p>
                {mine && (
                  <p className="text-xs">
                    <span className={mine.stakePaid ? "text-accent" : "text-danger"}>
                      Your stake {mine.stakePaid ? "paid" : "due"}
                    </span>
                    {l.complete && mine.finesBase > 0 && (
                      <>
                        {" · "}
                        <span className={mine.finesPaid ? "text-accent" : "text-danger"}>
                          fines £{mine.finesOwed} {mine.finesPaid ? "paid" : "due"}
                        </span>
                      </>
                    )}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="card space-y-1 p-0">
        <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">Wall of shame</p>
        <p className="px-4 text-xs text-muted">Total fines racked up all season</p>
        <div className="mt-1 divide-y divide-border">
          {topContributors.map((row, i) => (
            <div key={row.userId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="flex items-center gap-3">
                <span
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold",
                    i === 0 ? "bg-warn/15 text-warn" : "bg-white/5 text-muted",
                  ].join(" ")}
                >
                  {i + 1}
                </span>
                {row.name}
              </span>
              <span className="font-display text-base font-bold text-danger">£{row.total}</span>
            </div>
          ))}
          {topContributors.length === 0 && <p className="px-4 pb-4 text-sm text-muted">No fines yet — clean sheet.</p>}
        </div>
      </div>
    </div>
  );
}
