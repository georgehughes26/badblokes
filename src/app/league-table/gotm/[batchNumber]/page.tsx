import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getGotmBatches, getGotmWinners } from "@/lib/standings";
import { getBatchLedgers, withDoubledFines } from "@/lib/batch-settlement";
import { StandingsTable } from "@/components/standings-table";

export default async function GotmBatchPage({ params }: { params: Promise<{ batchNumber: string }> }) {
  const user = await requireUser();
  const { batchNumber } = await params;
  const batchNum = Number(batchNumber);
  if (!Number.isInteger(batchNum)) notFound();

  const season = await prisma.season.findFirst({ where: { active: true } });
  if (!season) notFound();

  const { completed } = await getGotmBatches(season.id);
  const batch = completed.find((b) => b.batchNumber === batchNum);
  if (!batch) notFound();

  // Fines shown here come from Result.fineAmount, which never reflects late
  // doubling — swap in the doubled-where-late figures from this batch's
  // ledger, same as everywhere else fines are displayed.
  const { completed: ledgers } = await getBatchLedgers(season.id);
  const ledger = ledgers.find((l) => l.batchNumber === batchNum);
  const rows = ledger ? withDoubledFines(batch.rows, ledger.rows) : batch.rows;

  const winners = getGotmWinners(batch.rows);
  const weekMin = Math.min(...batch.weekNumbers);
  const weekMax = Math.max(...batch.weekNumbers);

  return (
    <div className="space-y-4">
      <Link
        href="/league-table"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <span aria-hidden>&larr;</span> League Table
      </Link>

      <div className="card flex flex-col items-center gap-2 py-8 text-center">
        <p className="pill-amber">Gambler of the Month</p>
        <p className="font-display text-2xl font-bold">GOTM {batch.batchNumber}</p>
        <p className="text-sm text-muted">
          GW{weekMin}-{weekMax}
        </p>
        <p className="mt-2 text-sm text-muted">
          {winners.length > 1 ? "Winners" : "Winner"}:{" "}
          <span className="font-semibold text-foreground">{winners.map((w) => w.name).join(", ")}</span> —{" "}
          {winners[0]?.points ?? 0} pts
        </p>
      </div>

      <StandingsTable rows={rows} currentUserId={user.id} />
    </div>
  );
}
