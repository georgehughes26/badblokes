// One-off: MC's GW9 "no bet slip" fine goes from £5 to £10. GW9 is already
// settled, so this corrects the existing Result + FineLedgerEntry rows
// directly, and stamps the same override onto the Pick
// (fineOverrideAmount/Reason) so a future re-settle of GW9 won't silently
// recompute it back to £5 — same mechanism as the Chaz/Matty Parsons fine
// corrections (see lib/rules.ts / api/admin/results/route.ts's
// fine-override step).
//
// The fine was still unpaid, so no payment-status wrinkle here (unlike the
// Matty Parsons GW8 correction, which had already been paid as part of a
// batch sweep) — just bumping the owed amount.
//
// Safe to re-run.
//   npx tsx scripts/seed-mc-gw9-fine-bump.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { logAudit } from "../src/lib/audit";

const prisma = new PrismaClient();
const FINE_AMOUNT = 10;
const FINE_REASON = "£10 — no bet slip";

async function main() {
  const admin = await prisma.user.findFirst({ where: { username: "george", role: "ADMIN" } });
  if (!admin) throw new Error("admin 'george' not found");

  const season = await prisma.season.findFirst({ where: { active: true } });
  if (!season) throw new Error("no active season");

  const mc = await prisma.user.findUnique({ where: { username: "mattycarroll" } });
  if (!mc) throw new Error("MC (mattycarroll) not found");

  const gw9 = await prisma.gameweek.findFirst({ where: { seasonId: season.id, weekNumber: 9 } });
  if (!gw9) throw new Error("GW9 not found");

  const pick = await prisma.pick.findUnique({ where: { gameweekId_userId: { gameweekId: gw9.id, userId: mc.id } } });
  if (!pick) throw new Error("MC has no GW9 pick");

  const before = {
    pick: { fineOverrideAmount: pick.fineOverrideAmount, fineOverrideReason: pick.fineOverrideReason },
  };

  await prisma.pick.update({
    where: { id: pick.id },
    data: { fineOverrideAmount: FINE_AMOUNT, fineOverrideReason: FINE_REASON },
  });

  const result = await prisma.result.update({
    where: { gameweekId_userId: { gameweekId: gw9.id, userId: mc.id } },
    data: { fineAmount: FINE_AMOUNT, fineReason: FINE_REASON },
  });

  const fine = await prisma.fineLedgerEntry.update({
    where: { gameweekId_userId: { gameweekId: gw9.id, userId: mc.id } },
    data: { amount: FINE_AMOUNT, reason: FINE_REASON },
  });

  await logAudit({
    actorId: admin.id,
    action: "UPDATE",
    entityType: "Result",
    entityId: result.id,
    before,
    after: { fineAmount: result.fineAmount, fineReason: result.fineReason, fineLedgerEntryId: fine.id, paid: fine.paid },
    reason: "GW9 no-bet-slip fine bumped from £5 to £10",
  });

  console.log("Updated GW9 fine for", mc.name, "-> £" + fine.amount, "-", fine.reason, "(paid:", fine.paid + ")");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
