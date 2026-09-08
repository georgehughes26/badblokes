import { prisma } from "@/lib/prisma";
import {
  GOTM_STAKE,
  batchNumberForWeek,
  firstWeekOfBatch,
  getGotmBatches,
  getGotmWinners,
  type GotmBatch,
} from "@/lib/standings";

export interface BatchDueRow {
  userId: string;
  name: string;
  /** GOTM entry stake for this batch — always GOTM_STAKE. */
  stake: number;
  stakePaid: boolean;
  /** This batch's accumulated fines at face value. */
  finesBase: number;
  /** True when the fines deadline has passed with the fines unpaid (or they were paid after it) — finesOwed is then doubled. */
  finesLate: boolean;
  /** What's actually owed for fines: finesBase, or 2x once late. */
  finesOwed: number;
  finesPaid: boolean;
  /** stake still owed + fines still owed. */
  outstanding: number;
}

export interface BatchLedger {
  batchNumber: number;
  weekNumbers: number[];
  weekRangeLabel: string;
  complete: boolean;
  /** Stake for THIS batch is due by its first gameweek's pick deadline — null if that gameweek isn't scheduled yet. */
  stakeDeadline: Date | null;
  /** This batch's fines are due by the NEXT batch's first gameweek's pick deadline. Null until scheduled; only meaningful once complete. */
  finesDeadline: Date | null;
  finesPastDeadline: boolean;
  /** Winner(s) of the batch — empty until complete. */
  winnerNames: string[];
  /** GOTM_STAKE x everyone in the pool — the whole pot goes to the winner(s). */
  gotmPotTotal: number;
  paidOut: boolean;
  rows: BatchDueRow[];
  stakeCollected: number;
  stakeOutstanding: number;
  finesOutstanding: number;
}

interface Ctx {
  weeksById: Map<string, number>;
  pickDeadlineByWeek: Map<number, Date>;
  resultUserIdsByWeek: Map<number, Set<string>>;
  finesByUserWeek: Map<string, { amount: number; paid: boolean; paidAt: Date | null }>;
  stakePaidByKey: Map<string, boolean>;
  payoutBatches: Set<number>;
  activeUsers: { id: string; name: string; role: string }[];
  now: Date;
}

function keyUW(userId: string, week: number): string {
  return `${userId}:${week}`;
}

async function loadCtx(seasonId: string): Promise<Ctx> {
  const [gameweeks, results, fines, stakes, payouts, activeUsers] = await Promise.all([
    prisma.gameweek.findMany({ where: { seasonId }, select: { id: true, weekNumber: true, pickDeadlineAt: true } }),
    prisma.result.findMany({
      where: { gameweek: { seasonId } },
      select: { userId: true, gameweek: { select: { weekNumber: true } } },
    }),
    prisma.fineLedgerEntry.findMany({
      where: { gameweek: { seasonId } },
      select: { userId: true, amount: true, paid: true, paidAt: true, gameweek: { select: { weekNumber: true } } },
    }),
    prisma.gotmStakePayment.findMany({ where: { seasonId }, select: { batchNumber: true, userId: true, paid: true } }),
    prisma.gotmBatchPayout.findMany({ where: { seasonId }, select: { batchNumber: true } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true } }),
  ]);

  const weeksById = new Map(gameweeks.map((g) => [g.id, g.weekNumber]));
  const pickDeadlineByWeek = new Map(gameweeks.map((g) => [g.weekNumber, g.pickDeadlineAt]));

  const resultUserIdsByWeek = new Map<number, Set<string>>();
  for (const r of results) {
    const set = resultUserIdsByWeek.get(r.gameweek.weekNumber) ?? new Set<string>();
    set.add(r.userId);
    resultUserIdsByWeek.set(r.gameweek.weekNumber, set);
  }

  const finesByUserWeek = new Map<string, { amount: number; paid: boolean; paidAt: Date | null }>();
  for (const f of fines) {
    finesByUserWeek.set(keyUW(f.userId, f.gameweek.weekNumber), { amount: f.amount, paid: f.paid, paidAt: f.paidAt });
  }

  const stakePaidByKey = new Map(stakes.map((s) => [`${s.batchNumber}:${s.userId}`, s.paid]));
  const payoutBatches = new Set(payouts.map((p) => p.batchNumber));

  return {
    weeksById,
    pickDeadlineByWeek,
    resultUserIdsByWeek,
    finesByUserWeek,
    stakePaidByKey,
    payoutBatches,
    activeUsers,
    now: new Date(),
  };
}

function poolForBatch(batch: GotmBatch, ctx: Ctx): { id: string; name: string }[] {
  // Anyone with a result in one of the batch's weeks played it. Before a
  // batch has any settled gameweeks, fall back to whoever's playing the
  // season at all (a result anywhere), then to active PLAYER-role users.
  const batchWeeks = batch.weekNumbers.length > 0 ? batch.weekNumbers : [];
  const playedBatch = new Set<string>();
  for (const w of batchWeeks) for (const uid of ctx.resultUserIdsByWeek.get(w) ?? []) playedBatch.add(uid);

  let ids: Set<string>;
  if (playedBatch.size > 0) {
    ids = playedBatch;
  } else {
    const playedSeason = new Set<string>();
    for (const set of ctx.resultUserIdsByWeek.values()) for (const uid of set) playedSeason.add(uid);
    ids = playedSeason.size > 0 ? playedSeason : new Set(ctx.activeUsers.filter((u) => u.role === "PLAYER").map((u) => u.id));
  }

  return ctx.activeUsers.filter((u) => ids.has(u.id)).map((u) => ({ id: u.id, name: u.name }));
}

function buildLedger(batch: GotmBatch, ctx: Ctx): BatchLedger {
  const weekMin = batch.weekNumbers.length > 0 ? Math.min(...batch.weekNumbers) : firstWeekOfBatch(batch.batchNumber);
  const weekMax = batch.weekNumbers.length > 0 ? Math.max(...batch.weekNumbers) : weekMin + 3;
  const weekRangeLabel = weekMin === weekMax ? `GW${weekMin}` : `GW${weekMin}-${weekMax}`;

  const stakeDeadline = ctx.pickDeadlineByWeek.get(firstWeekOfBatch(batch.batchNumber)) ?? null;
  const finesDeadline = ctx.pickDeadlineByWeek.get(firstWeekOfBatch(batch.batchNumber + 1)) ?? null;
  const finesPastDeadline = finesDeadline != null && ctx.now.getTime() > finesDeadline.getTime();

  const batchWeeks = batch.weekNumbers.length > 0 ? batch.weekNumbers : [];

  const rows: BatchDueRow[] = poolForBatch(batch, ctx)
    .map(({ id, name }) => {
      const stakePaid = ctx.stakePaidByKey.get(`${batch.batchNumber}:${id}`) ?? false;

      let finesBase = 0;
      let finesPaid = true;
      let paidAnyLate = false;
      for (const w of batchWeeks) {
        const entry = ctx.finesByUserWeek.get(keyUW(id, w));
        if (!entry) continue;
        finesBase += entry.amount;
        if (!entry.paid) finesPaid = false;
        else if (finesDeadline && entry.paidAt && entry.paidAt.getTime() > finesDeadline.getTime()) paidAnyLate = true;
      }
      if (finesBase === 0) finesPaid = true;

      const finesLate = finesBase > 0 && ((!finesPaid && finesPastDeadline) || paidAnyLate);
      const finesOwed = finesLate ? finesBase * 2 : finesBase;

      const outstanding = (stakePaid ? 0 : GOTM_STAKE) + (finesPaid ? 0 : finesOwed);

      return { userId: id, name, stake: GOTM_STAKE, stakePaid, finesBase, finesLate, finesOwed, finesPaid, outstanding };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const winnerNames = batch.complete ? getGotmWinners(batch.rows).map((w) => w.name) : [];

  return {
    batchNumber: batch.batchNumber,
    weekNumbers: batch.weekNumbers,
    weekRangeLabel,
    complete: batch.complete,
    stakeDeadline,
    finesDeadline,
    finesPastDeadline,
    winnerNames,
    gotmPotTotal: GOTM_STAKE * rows.length,
    paidOut: ctx.payoutBatches.has(batch.batchNumber),
    rows,
    stakeCollected: rows.filter((r) => r.stakePaid).length * GOTM_STAKE,
    stakeOutstanding: rows.filter((r) => !r.stakePaid).length * GOTM_STAKE,
    finesOutstanding: rows.filter((r) => !r.finesPaid).reduce((s, r) => s + r.finesOwed, 0),
  };
}

/** The GOTM money ledger per batch — the current (still-filling) batch and every completed one, most recent first. */
export async function getBatchLedgers(seasonId: string): Promise<{ current: BatchLedger; completed: BatchLedger[] }> {
  const [{ current, completed }, ctx] = await Promise.all([getGotmBatches(seasonId), loadCtx(seasonId)]);
  return {
    current: buildLedger(current, ctx),
    completed: completed.map((b) => buildLedger(b, ctx)),
  };
}

export interface PlayerBatchDue extends BatchDueRow {
  batchNumber: number;
  weekRangeLabel: string;
  complete: boolean;
  stakeDeadline: Date | null;
  finesDeadline: Date | null;
}

/** One player's own dues across the current batch and every completed one. */
export async function getPlayerBatchDues(seasonId: string, userId: string): Promise<PlayerBatchDue[]> {
  const { current, completed } = await getBatchLedgers(seasonId);
  const out: PlayerBatchDue[] = [];
  for (const ledger of [...completed, current]) {
    const row = ledger.rows.find((r) => r.userId === userId);
    if (!row) continue;
    out.push({
      ...row,
      batchNumber: ledger.batchNumber,
      weekRangeLabel: ledger.weekRangeLabel,
      complete: ledger.complete,
      stakeDeadline: ledger.stakeDeadline,
      finesDeadline: ledger.finesDeadline,
    });
  }
  return out;
}

export { GOTM_STAKE, batchNumberForWeek };
