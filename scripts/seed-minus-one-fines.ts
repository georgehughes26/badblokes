// One-off: the standing rule "a -1 points penalty comes with a £10 fine",
// backfilled onto everyone who already has a -1 this season (except MC,
// whose GW9 no-bet-slip fine was already bumped £5 -> £10 directly —
// see seed-mc-gw9-fine-bump.ts). Tom, Matthew Parsons and Chaz each get a
// flat £10 FineLedgerEntry, filed against the last COMPLETED GOTM batch
// (batch 2, GW5-8) rather than the still-open current one, on a gameweek
// where they don't already have a fine entry (the unique [gameweekId,
// userId] constraint allows only one row per player per week).
//
// exemptFromLateDoubling: true on every row — this is a flat disciplinary
// fine, not an ordinary match fine, so it must never get swept into the
// 2x-if-paid-late calculation the way a normal weekly fine does (see
// lib/batch-settlement.ts buildLedger). Without that flag, Chaz's batch 2
// is already marked late, and this fine would double to £20 the moment it
// landed — explicitly not what was asked for.
//
// Matthew Parsons' is marked paid immediately (he's already settled up);
// Tom's and Chaz's are left unpaid.
//
// Not stamped onto any Pick's fineOverrideAmount — unlike the other
// one-off fine corrections this season, this fine has nothing to do with
// that week's actual pick/result, so forcing a future re-settle of GW5 or
// GW8 to always show £10 for an unrelated match outcome would be wrong.
// If that gameweek is ever genuinely re-settled, this entry would need
// re-applying by hand.
//
// Safe to re-run — upserts rather than duplicating.
//   npx tsx scripts/seed-minus-one-fines.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { logAudit } from "../src/lib/audit";

const prisma = new PrismaClient();
const FINE_AMOUNT = 10;

const TARGETS: { username: string; weekNumber: number; reason: string; paid: boolean }[] = [
  { username: "TICKER", weekNumber: 8, reason: "£10 — -1 penalty (First To Leave 2026)", paid: false },
  { username: "MattyP", weekNumber: 5, reason: "£10 — -1 penalty (GOTM 1 — paid late)", paid: true },
  { username: "Chaz", weekNumber: 8, reason: "£10 — -1 penalty (GOTM 2 — paid late)", paid: false },
];

async function main() {
  const admin = await prisma.user.findFirst({ where: { username: "george", role: "ADMIN" } });
  if (!admin) throw new Error("admin 'george' not found");

  const season = await prisma.season.findFirst({ where: { active: true } });
  if (!season) throw new Error("no active season");

  for (const target of TARGETS) {
    const user = await prisma.user.findUnique({ where: { username: target.username } });
    if (!user) throw new Error(`${target.username} not found`);

    const gameweek = await prisma.gameweek.findFirst({ where: { seasonId: season.id, weekNumber: target.weekNumber } });
    if (!gameweek) throw new Error(`GW${target.weekNumber} not found`);

    const existing = await prisma.fineLedgerEntry.findUnique({
      where: { gameweekId_userId: { gameweekId: gameweek.id, userId: user.id } },
    });
    if (existing) {
      console.log(`Skipping ${user.name} — GW${target.weekNumber} already has a fine entry (£${existing.amount}, ${existing.reason})`);
      continue;
    }

    const fine = await prisma.fineLedgerEntry.create({
      data: {
        gameweekId: gameweek.id,
        userId: user.id,
        amount: FINE_AMOUNT,
        reason: target.reason,
        exemptFromLateDoubling: true,
        paid: target.paid,
        paidAt: target.paid ? new Date() : null,
        recordedById: admin.id,
      },
    });
    await logAudit({
      actorId: admin.id,
      action: "CREATE",
      entityType: "FineLedgerEntry",
      entityId: fine.id,
      after: fine,
      reason: target.reason,
    });
    console.log(`Created: ${user.name} GW${target.weekNumber} £${fine.amount} — ${fine.reason} (paid: ${fine.paid})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
