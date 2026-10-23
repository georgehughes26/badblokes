// One-off: Matthew Parsons' GW8 pick (Brighton & Hove Albion) got moved to
// Sunday 2pm — outside the pool's 3pm Saturday kickoff rule — making it an
// invalid pick. GW8 was already settled with the normal £2 "team didn't
// win" fine, so this corrects the existing Result + FineLedgerEntry rows
// directly to a flat £5 "invalid pick" fine, and stamps the same override
// onto the Pick (fineOverrideAmount/Reason) so a future re-settle of GW8
// won't silently recompute it back to £2 — same mechanism as Chaz's GW7
// forced joker/fine (see lib/rules.ts jokerDoublingDisabled and
// api/admin/results/route.ts's fine-override step).
//
// Deliberately leaves the FineLedgerEntry's `paid`/`paidAt` as they were —
// he'd already paid the old £2 as part of the GOTM 2 batch's bulk
// "fines paid" sweep, so flipping this one row back to unpaid would reopen
// the whole batch and risk it doubling at tonight's GW9 deadline over a
// retroactive correction, which isn't the point here. The extra £3 versus
// what he actually paid is a manual top-up for the admin to chase (or not)
// outside the app, not something the Pot should auto-flag as outstanding.
//
// Breach flags are untouched — he did genuinely lose the pick, that part
// of the record stays true; only the fine amount/reason/rule changes.
//
// Safe to re-run.
//   npx tsx scripts/seed-mattyp-gw8-invalid-pick.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { logAudit } from "../src/lib/audit";

const prisma = new PrismaClient();
const FINE_AMOUNT = 5;
const FINE_REASON = "£5 — invalid pick (Brighton moved to Sunday 2pm, outside the 3pm kickoff window)";

async function main() {
  const admin = await prisma.user.findFirst({ where: { username: "george", role: "ADMIN" } });
  if (!admin) throw new Error("admin 'george' not found");

  const season = await prisma.season.findFirst({ where: { active: true } });
  if (!season) throw new Error("no active season");

  const mattyP = await prisma.user.findUnique({ where: { username: "MattyP" } });
  if (!mattyP) throw new Error("Matty Parsons (MattyP) not found");

  const gw8 = await prisma.gameweek.findFirst({ where: { seasonId: season.id, weekNumber: 8 } });
  if (!gw8) throw new Error("GW8 not found");

  const pick = await prisma.pick.findUnique({ where: { gameweekId_userId: { gameweekId: gw8.id, userId: mattyP.id } } });
  if (!pick) throw new Error("Matty Parsons has no GW8 pick");

  const before = {
    pick: { fineOverrideAmount: pick.fineOverrideAmount, fineOverrideReason: pick.fineOverrideReason },
  };

  await prisma.pick.update({
    where: { id: pick.id },
    data: { fineOverrideAmount: FINE_AMOUNT, fineOverrideReason: FINE_REASON },
  });

  const result = await prisma.result.update({
    where: { gameweekId_userId: { gameweekId: gw8.id, userId: mattyP.id } },
    data: { fineAmount: FINE_AMOUNT, fineRuleId: "INVALID_PICK", fineReason: FINE_REASON },
  });

  const fine = await prisma.fineLedgerEntry.update({
    where: { gameweekId_userId: { gameweekId: gw8.id, userId: mattyP.id } },
    data: { amount: FINE_AMOUNT, reason: FINE_REASON },
  });

  await logAudit({
    actorId: admin.id,
    action: "UPDATE",
    entityType: "Result",
    entityId: result.id,
    before,
    after: { fineAmount: result.fineAmount, fineRuleId: result.fineRuleId, fineReason: result.fineReason, fineLedgerEntryId: fine.id, paid: fine.paid },
    reason: "GW8 Brighton pick ruled invalid — rescheduled outside the 3pm kickoff window",
  });

  console.log("Updated GW8 fine for", mattyP.name, "-> £" + fine.amount, "-", fine.reason, "(paid:", fine.paid + ")");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
