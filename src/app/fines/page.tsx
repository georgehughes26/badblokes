import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatLondon } from "@/lib/time";

export default async function FinesPage() {
  const user = await requireUser();

  const [myUnpaid, potEntries, allTimeByUser, nextGameweek] = await Promise.all([
    prisma.fineLedgerEntry.findMany({
      where: { userId: user.id, paid: false },
      include: { gameweek: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.fineLedgerEntry.findMany({ where: { paid: false } }),
    prisma.fineLedgerEntry.groupBy({ by: ["userId"], _sum: { amount: true } }),
    prisma.gameweek.findFirst({
      where: { status: { not: "SETTLED" } },
      orderBy: [{ season: { startDate: "desc" } }, { weekNumber: "asc" }],
    }),
  ]);

  const myOwed = myUnpaid.reduce((sum, f) => sum + f.amount, 0);
  const potTotal = potEntries.reduce((sum, f) => sum + f.amount, 0);

  const userIds = allTimeByUser.map((r) => r.userId);
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  const topContributors = allTimeByUser
    .map((r) => ({ userId: r.userId, name: nameById.get(r.userId) ?? "?", total: r._sum.amount ?? 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">The Pot</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">You owe</p>
          <p className="font-display text-5xl font-bold text-danger">£{myOwed}</p>
          {myOwed > 0 && nextGameweek && (
            <p className="text-xs text-muted">Pay by {formatLondon(nextGameweek.picksOpenAt, "EEE d MMM")}</p>
          )}
          {myUnpaid.length > 0 && (
            <div className="mt-3 divide-y divide-border border-t border-border pt-2">
              {myUnpaid.map((fine) => (
                <div key={fine.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-muted">
                    GW{fine.gameweek.weekNumber} — {fine.reason}
                  </span>
                  <span className="font-semibold text-danger">£{fine.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Current pot</p>
          <p className="font-display text-5xl font-bold text-accent">£{potTotal}</p>
          <p className="mt-2 text-xs text-muted">Total unpaid fines across the group</p>
        </div>
      </div>

      <div className="card space-y-1 p-0">
        <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">Wall of shame</p>
        <div className="divide-y divide-border">
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
