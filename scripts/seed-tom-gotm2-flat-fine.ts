// One-off: a flat £35 fine for Tom, filed against GOTM 2 (GW5-8, same
// batch as his existing -1-linked £10 — see seed-minus-one-fines.ts),
// already paid. No points adjustment this time — just the fine.
//
// exemptFromLateDoubling: true, same reasoning as the -1 fines — a flat
// admin-assessed fine shouldn't get doubled by the batch's late-fine
// machinery just because it's being recorded after GOTM 2's deadline has
// passed (see lib/batch-settlement.ts buildLedger).
//
// Filed on GW5, the first empty week in that batch for Tom (GW8 is
// already taken by his -1 fine).
//
// Safe to re-run.
//   npx tsx scripts/seed-tom-gotm2-flat-fine.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { logAudit } from "../src/lib/audit";

const prisma = new PrismaClient();
const FINE_AMOUNT = 35;
const FINE_REASON = "£35 fine";

async function main() {
  const admin = await prisma.user.findFirst({ where: { username: "george", role: "ADMIN" } });
  if (!admin) throw new Error("admin 'george' not found");

  const season = await prisma.season.findFirst({ where: { active: true } });
  if (!season) throw new Error("no active season");

  const tom = await prisma.user.findUnique({ where: { username: "TICKER" } });
  if (!tom) throw new Error("Tom (TICKER) not found");

  const gw5 = await prisma.gameweek.findFirst({ where: { seasonId: season.id, weekNumber: 5 } });
  if (!gw5) throw new Error("GW5 not found");

  const existing = await prisma.fineLedgerEntry.findUnique({
    where: { gameweekId_userId: { gameweekId: gw5.id, userId: tom.id } },
  });
  if (existing) {
    console.log(`Skipping — Tom already has a GW5 fine entry (£${existing.amount}, ${existing.reason})`);
    return;
  }

  const fine = await prisma.fineLedgerEntry.create({
    data: {
      gameweekId: gw5.id,
      userId: tom.id,
      amount: FINE_AMOUNT,
      reason: FINE_REASON,
      exemptFromLateDoubling: true,
      paid: true,
      paidAt: new Date(),
      recordedById: admin.id,
    },
  });
  await logAudit({
    actorId: admin.id,
    action: "CREATE",
    entityType: "FineLedgerEntry",
    entityId: fine.id,
    after: fine,
    reason: FINE_REASON,
  });
  console.log(`Created: Tom GW5 £${fine.amount} — ${fine.reason} (paid: ${fine.paid})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
