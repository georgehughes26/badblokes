import { prisma } from "@/lib/prisma";
import { getBatchLedgers, type BatchLedger } from "@/lib/batch-settlement";
import { formatWinners } from "@/lib/standings";
import { setGotmStakePaid, setBatchFinesPaid, setGotmPaidOut } from "@/lib/actions/admin";
import { ErrorBanner, SuccessBanner } from "@/components/banners";
import { formatLondon } from "@/lib/time";

export default async function AdminFinesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const season = await prisma.season.findFirst({ where: { active: true } });
  if (!season) {
    return <p className="card text-center text-sm text-muted">No active season.</p>;
  }

  const { current, completed } = await getBatchLedgers(season.id);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">Fine Ledger &amp; GOTM money</h1>
      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      {completed.map((ledger) => (
        <BatchBlock key={ledger.batchNumber} ledger={ledger} seasonId={season.id} />
      ))}
      <BatchBlock ledger={current} seasonId={season.id} />
    </div>
  );
}

function Toggle({
  action,
  paid,
  hidden,
  label,
}: {
  action: (formData: FormData) => void | Promise<void>;
  paid: boolean;
  hidden: Record<string, string | number>;
  label: string;
}) {
  return (
    <form action={action}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={String(v)} />
      ))}
      <input type="hidden" name="paid" value={(!paid).toString()} />
      <button
        type="submit"
        aria-label={`${paid ? "Unmark" : "Mark"} ${label} as paid`}
        className={[
          "min-h-8 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
          paid ? "bg-accent/15 text-accent hover:bg-accent/25" : "bg-white/5 text-muted hover:bg-white/10",
        ].join(" ")}
      >
        {paid ? "Paid" : "Mark paid"}
      </button>
    </form>
  );
}

function PayoutForm({
  seasonId,
  batchNumber,
  outcome,
  label,
}: {
  seasonId: string;
  batchNumber: number;
  outcome: "winner" | "pot" | "none";
  label: string;
}) {
  return (
    <form action={setGotmPaidOut}>
      <input type="hidden" name="seasonId" value={seasonId} />
      <input type="hidden" name="batchNumber" value={batchNumber} />
      <input type="hidden" name="outcome" value={outcome} />
      <button type="submit" className="btn-secondary !px-3 !py-1.5 text-xs">
        {label}
      </button>
    </form>
  );
}

function BatchBlock({ ledger, seasonId }: { ledger: BatchLedger; seasonId: string }) {
  const stakeUnpaid = ledger.rows.filter((r) => !r.stakePaid).length;
  const finesUnpaid = ledger.rows.filter((r) => !r.finesPaid && r.finesBase > 0).length;

  return (
    <section className="card space-y-3 p-0">
      <div className="space-y-1 px-4 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-lg font-bold">
            GOTM {ledger.batchNumber} <span className="font-normal text-muted">— {ledger.weekRangeLabel}</span>
          </p>
          {ledger.complete ? (
            <span className="pill-green">Batch complete</span>
          ) : (
            <span className="pill-amber">In progress</span>
          )}
        </div>
        <p className="text-xs text-muted">
          Pot £{ledger.gotmPotTotal} → {ledger.complete ? formatWinners(ledger.winnerNames) : "winner TBD"}
          {" · "}
          Stakes due {ledger.stakeDeadline ? formatLondon(ledger.stakeDeadline, "EEE d MMM") : `once GW${(ledger.batchNumber - 1) * 4 + 1} is scheduled`}
        </p>
        {ledger.complete && (
          <p className="text-xs text-muted">
            Fines due{" "}
            {ledger.finesDeadline
              ? `${formatLondon(ledger.finesDeadline, "EEE d MMM")}${ledger.finesPastDeadline ? " — PASSED, unpaid fines now doubled" : ""}`
              : `once GW${ledger.batchNumber * 4 + 1} is scheduled`}
          </p>
        )}
        <p className="text-xs text-muted">
          Outstanding: £{ledger.stakeOutstanding} stakes ({stakeUnpaid}){ledger.complete && `, £${ledger.finesOutstanding} fines (${finesUnpaid})`}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm sm:min-w-[480px]">
          <thead>
            <tr className="border-y border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5">Player</th>
              <th className="px-3 py-2.5 text-right">GOTM £{ledger.rows[0]?.stake ?? 10}</th>
              {ledger.complete && <th className="px-3 py-2.5 text-right">Fines</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ledger.rows.map((row) => (
              <tr key={row.userId}>
                <td className="px-4 py-2.5 font-medium">{row.name}</td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end">
                    <Toggle
                      action={setGotmStakePaid}
                      paid={row.stakePaid}
                      hidden={{ seasonId, batchNumber: ledger.batchNumber, userId: row.userId }}
                      label="GOTM stake"
                    />
                  </div>
                </td>
                {ledger.complete && (
                  <td className="px-3 py-2.5">
                    {row.finesBase === 0 ? (
                      <span className="block text-right text-xs text-muted">—</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <span className={["text-xs", row.finesLate ? "font-semibold text-danger" : "text-muted"].join(" ")}>
                          £{row.finesOwed}
                          {row.finesLate && ` (was £${row.finesBase})`}
                        </span>
                        <Toggle
                          action={setBatchFinesPaid}
                          paid={row.finesPaid}
                          hidden={{ seasonId, batchNumber: ledger.batchNumber, userId: row.userId }}
                          label="fines"
                        />
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ledger.complete && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <span className="text-xs text-muted">
            {ledger.rolledToPot
              ? `Split — the £${ledger.gotmPotTotal} pot was rolled into the fines pot.`
              : ledger.paidOut
                ? `Winner has been paid the £${ledger.gotmPotTotal} pot.`
                : `£${ledger.gotmPotTotal} pot not settled yet.`}
          </span>
          {ledger.paidOut || ledger.rolledToPot ? (
            <PayoutForm seasonId={seasonId} batchNumber={ledger.batchNumber} outcome="none" label="Undo" />
          ) : (
            <div className="flex gap-2">
              <PayoutForm seasonId={seasonId} batchNumber={ledger.batchNumber} outcome="winner" label="Paid to winner" />
              <PayoutForm seasonId={seasonId} batchNumber={ledger.batchNumber} outcome="pot" label="Split — roll into pot" />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
