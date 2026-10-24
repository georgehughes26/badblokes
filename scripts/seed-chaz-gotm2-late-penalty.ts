// One-off: -1 points for Chaz — he didn't pay his GOTM 2 (GW5-8) fines by
// the GW9 deadline (Fri 23 Oct 23:59), so they've doubled £14 -> £28. Same
// shape as the existing late-payment penalties (seed-gotm-late-penalty.ts
// for Matty Parsons' GOTM 1): a season-scoped PointsAdjustment, so it shows
// in this season's League Table (and its Deductions footnote) and flows
// into his All Time total. Safe to re-run — finds an existing adjustment
// for the same user+reason instead of duplicating one.
//   npx tsx scripts/seed-chaz-gotm2-late-penalty.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { logAudit } from "../src/lib/audit";

const prisma = new PrismaClient();
const REASON = "GOTM 2 — paid late";

async function main() {
  const admin = await prisma.user.findFirst({ where: { username: "george", role: "ADMIN" } });
  if (!admin) throw new Error("admin 'george' not found");

  const season = await prisma.season.findFirst({ where: { active: true } });
  if (!season) throw new Error("no active season");

  const chaz = await prisma.user.findUnique({ where: { username: "Chaz" } });
  if (!chaz) throw new Error("Chaz not found");

  const existing = await prisma.pointsAdjustment.findFirst({
    where: { seasonId: season.id, userId: chaz.id, reason: REASON },
  });
  if (existing) {
    console.log("Already exists:", chaz.name, existing.points, existing.reason);
    return;
  }

  const created = await prisma.pointsAdjustment.create({
    data: { seasonId: season.id, userId: chaz.id, points: -1, reason: REASON },
  });
  await logAudit({
    actorId: admin.id,
    action: "CREATE",
    entityType: "PointsAdjustment",
    entityId: created.id,
    after: created,
    reason: REASON,
  });
  console.log("Created:", chaz.name, created.points, created.reason);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
