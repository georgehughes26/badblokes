// One-off: Chaz picked his team outside the app this week (GW7, 2026-27),
// so George is entering it on his behalf — same pattern as Tom's locked-out
// Brentford pick in GW4 (Pick.overriddenByAdmin/overrideReason).
//
// On top of that, three deliberate penalties for not using the app:
//   1. His pick (Mansfield Town) forcibly consumes his H1 joker — isJoker:
//      true, which is all lib/jokers.ts needs to count it as used.
//   2. jokerDoublingDisabled: true — so if Mansfield wins, it still only
//      scores a normal 1pt, not the usual 2x (see rules.ts computePoints).
//      Breach/fine computation is untouched: if Mansfield loses, the
//      ordinary £10 "joker played and lost" fine still fires on its own.
//   3. fineOverrideAmount: 10 — a flat £10 regardless of the match result
//      (so a Mansfield win doesn't let him dodge the fine). Applied now as
//      a FineLedgerEntry so it's visible in the Pot immediately, AND
//      stamped onto the Pick so /api/admin/results writes the same £10
//      into the real Result once GW7 is actually settled, instead of
//      recomputing something else from the match outcome.
//
// Safe to re-run — upserts both rows rather than duplicating them.
//   npx tsx scripts/seed-chaz-gw7-pick.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { logAudit } from "../src/lib/audit";

const prisma = new PrismaClient();
const FINE_REASON = "£10 — picked outside the app, joker forfeited";

async function main() {
  const admin = await prisma.user.findFirst({ where: { username: "george", role: "ADMIN" } });
  if (!admin) throw new Error("admin 'george' not found");

  const season = await prisma.season.findFirst({ where: { active: true } });
  if (!season) throw new Error("no active season");

  const chaz = await prisma.user.findUnique({ where: { username: "Chaz" } });
  if (!chaz) throw new Error("Chaz not found");

  const gw7 = await prisma.gameweek.findFirst({ where: { seasonId: season.id, weekNumber: 7 } });
  if (!gw7) throw new Error("GW7 not found");

  const mansfield = await prisma.team.findFirst({ where: { name: "Mansfield Town" } });
  if (!mansfield) throw new Error("Mansfield Town not found");

  const pick = await prisma.pick.upsert({
    where: { gameweekId_userId: { gameweekId: gw7.id, userId: chaz.id } },
    create: {
      gameweekId: gw7.id,
      userId: chaz.id,
      teamId: mansfield.id,
      isJoker: true,
      jokerDoublingDisabled: true,
      overriddenByAdmin: true,
      overrideReason: "Entered by admin on Chaz's behalf — picked outside the app",
      fineOverrideAmount: 10,
      fineOverrideReason: FINE_REASON,
    },
    update: {
      teamId: mansfield.id,
      isJoker: true,
      jokerDoublingDisabled: true,
      overriddenByAdmin: true,
      overrideReason: "Entered by admin on Chaz's behalf — picked outside the app",
      fineOverrideAmount: 10,
      fineOverrideReason: FINE_REASON,
    },
  });
  await logAudit({
    actorId: admin.id,
    action: "CREATE",
    entityType: "Pick",
    entityId: pick.id,
    after: pick,
    reason: "Manual pick on Chaz's behalf, joker forfeited as a penalty",
  });
  console.log("Pick:", chaz.name, "-> Mansfield Town, GW7, joker=true (no double), fine override=£10");

  const fine = await prisma.fineLedgerEntry.upsert({
    where: { gameweekId_userId: { gameweekId: gw7.id, userId: chaz.id } },
    create: { gameweekId: gw7.id, userId: chaz.id, amount: 10, reason: FINE_REASON, recordedById: admin.id },
    update: { amount: 10, reason: FINE_REASON, recordedById: admin.id },
  });
  await logAudit({
    actorId: admin.id,
    action: "CREATE",
    entityType: "FineLedgerEntry",
    entityId: fine.id,
    after: fine,
    reason: FINE_REASON,
  });
  console.log("Fine:", chaz.name, "£" + fine.amount, "-", fine.reason);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
