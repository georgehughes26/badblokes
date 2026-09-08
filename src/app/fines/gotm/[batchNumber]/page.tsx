import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getBatchLedgers } from "@/lib/batch-settlement";
import { formatWinners } from "@/lib/standings";
import { formatLondon } from "@/lib/time";

export default async function FinesGotmBatchPage({ params }: { params: Promise<{ batchNumber: string }> }) {
  const user = await requireUser();
  const { batchNumber } = await params;
  const batchNum = Number(batchNumber);
  if (!Number.isInteger(batchNum) || batchNum < 1) notFound();

  const season = await prisma.season.findFirst({ where: { active: true } });
  if (!season) notFound();

  const { current, completed } = await getBatchLedgers(season.id);
  const ledger = [current, ...completed].find((l) => l.batchNumber === batchNum);
  if (!ledger) notFound();

  const stakePot = ledger.gotmPotTotal;
  const stakeIn = ledger.stakeCollected;

  return (
    <div className="space-y-4">
      <Link
        href="/fines"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <span aria-hidden>&larr;</span> The Pot
      </Link>

      <div className="card flex flex-col items-center gap-2 py-8 text-center">
        <p className="pill-amber">Gambler of the Month</p>
        <p className="font-display text-2xl font-bold">
          GOTM {ledger.batchNumber} <span className="font-normal text-muted">— {ledger.weekRangeLabel}</span>
        </p>
        {!ledger.complete ? (
          <p className="text-sm text-muted">In progress — £{stakePot} pot riding on the batch winner.</p>
        ) : ledger.rolledToPot ? (
          <p className="text-sm text-muted">
            Tied {ledger.winnerNames.length > 1 ? `(${formatWinners(ledger.winnerNames)})` : ""} — the whole £{stakePot}{" "}
            pot was <span className="font-semibold text-foreground">rolled into the fines pot</span>.
          </p>
        ) : (
          <p className="text-sm text-muted">
            {ledger.winnerNames.length > 1 ? "Winners" : "Winner"}:{" "}
            <span className="font-semibold text-foreground">{formatWinners(ledger.winnerNames)}</span> — pot £{stakePot}
            {ledger.paidOut ? " (paid out)" : " (not paid out yet)"}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-flat py-4 text-center">
          <p className="font-display text-2xl font-bold text-accent">
            £{stakeIn}
            <span className="text-base text-muted">/{stakePot}</span>
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">GOTM stakes in</p>
        </div>
        <div className="card-flat py-4 text-center">
          <p className="font-display text-2xl font-bold text-danger">£{ledger.finesOutstanding}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Fines outstanding</p>
        </div>
      </div>

      {ledger.complete && ledger.finesDeadline && (
        <p className="text-center text-xs text-muted">
          Fines were due {formatLondon(ledger.finesDeadline, "EEE d MMM")}
          {ledger.finesPastDeadline && " — anything unpaid after that counts double"}
        </p>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm sm:min-w-[420px]">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Player</th>
              <th className="px-3 py-3 text-right">GOTM £{ledger.rows[0]?.stake ?? 10}</th>
              <th className="px-3 py-3 text-right sm:px-4">Fines</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ledger.rows.map((row) => {
              const isYou = row.userId === user.id;
              return (
                <tr key={row.userId} className={isYou ? "bg-accent/10" : undefined}>
                  <td className="px-4 py-3 font-medium">
                    {row.name}
                    {isYou && <span className="pill-green ml-2">You</span>}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={row.stakePaid ? "text-accent" : "text-danger"}>{row.stakePaid ? "Paid" : "Due"}</span>
                  </td>
                  <td className="px-3 py-3 text-right sm:px-4">
                    {row.finesBase === 0 ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <span className={row.finesLate && !row.finesPaid ? "font-semibold text-danger" : undefined}>
                        £{row.finesOwed}
                        {row.finesLate && <span className="text-xs"> (was £{row.finesBase})</span>}{" "}
                        <span className={row.finesPaid ? "text-accent" : "text-danger"}>{row.finesPaid ? "paid" : "due"}</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
