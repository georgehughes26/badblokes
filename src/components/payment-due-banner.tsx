import Link from "next/link";
import { getPlayerBatchDues } from "@/lib/batch-settlement";
import { batchNumberForWeek, firstWeekOfBatch } from "@/lib/standings";
import { formatLondon } from "@/lib/time";

/**
 * The "pay window" nudge on the home page: the first gameweek of a GOTM
 * batch is when the *previous* batch's fines and *this* batch's £10 stake
 * both fall due — by this gameweek's pick deadline, same as the picks
 * themselves. Shows what this player still owes; renders nothing if they're
 * square or it isn't a batch-opening gameweek.
 */
export async function PaymentDueBanner({
  userId,
  seasonId,
  weekNumber,
}: {
  userId: string;
  seasonId: string;
  weekNumber: number;
}) {
  const batchNumber = batchNumberForWeek(weekNumber);
  if (firstWeekOfBatch(batchNumber) !== weekNumber) return null;

  const dues = await getPlayerBatchDues(seasonId, userId);
  const thisBatch = dues.find((d) => d.batchNumber === batchNumber);
  const prevBatch = dues.find((d) => d.batchNumber === batchNumber - 1);

  const items: { label: string; amount: number }[] = [];
  if (thisBatch && !thisBatch.stakePaid) {
    items.push({ label: `GOTM ${batchNumber} stake`, amount: thisBatch.stake });
  }
  if (prevBatch && !prevBatch.finesPaid && prevBatch.finesOwed > 0) {
    items.push({
      label: `GOTM ${prevBatch.batchNumber} fines${prevBatch.finesLate ? " — doubled, late" : ""}`,
      amount: prevBatch.finesOwed,
    });
  }
  if (items.length === 0) return null;

  const total = items.reduce((s, i) => s + i.amount, 0);
  const deadline = thisBatch?.stakeDeadline ?? prevBatch?.finesDeadline ?? null;

  return (
    <div className="card space-y-3 border-warn/50 bg-warn/5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-sm font-bold uppercase tracking-wide text-warn">Due with your pick</p>
        <p className="font-display text-2xl font-bold text-warn">£{total}</p>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {items.map((i) => (
          <div key={i.label} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="text-muted">{i.label}</span>
            <span className="font-semibold">£{i.amount}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">
        {deadline
          ? `Pay by ${formatLondon(deadline, "EEE d MMM, HH:mm")} — same deadline as picks. Late fines double.`
          : "Pay before picks close. Late fines double."}{" "}
        <Link href="/fines" className="font-semibold text-foreground hover:underline">
          The Pot &rarr;
        </Link>
      </p>
    </div>
  );
}
