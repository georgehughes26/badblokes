// One-off: -1 points for MC (Matty Carroll) — didn't put his bet on. Same
// shape as the other manual season penalties (First To Leave, GOTM late
// payments): a season-scoped PointsAdjustment, shown in the League Table's
// Deductions footnote and folded into his All Time total. Safe to re-run —
// finds an existing adjustment for the same user+reason instead of
// duplicating one.
//   npx tsx scripts/seed-mc-no-bet-penalty.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { logAudit } from "../src/lib/audit";

const prisma = new PrismaClient();
const REASON = "Didn't put his bet on";

async function main() {
  const admin = await prisma.user.findFirst({ where: { username: "george", role: "ADMIN" } });
  if (!admin) throw new Error("admin 'george' not found");

  const season = await prisma.season.findFirst({ where: { active: true } });
  if (!season) throw new Error("no active season");

  const mc = await prisma.user.findUnique({ where: { username: "mattycarroll" } });
  if (!mc) throw new Error("MC (mattycarroll) not found");

  const existing = await prisma.pointsAdjustment.findFirst({
    where: { seasonId: season.id, userId: mc.id, reason: REASON },
  });
  if (existing) {
    console.log("Already exists:", mc.name, existing.points, existing.reason);
    return;
  }

  const created = await prisma.pointsAdjustment.create({
    data: { seasonId: season.id, userId: mc.id, points: -1, reason: REASON },
  });
  await logAudit({
    actorId: admin.id,
    action: "CREATE",
    entityType: "PointsAdjustment",
    entityId: created.id,
    after: created,
    reason: REASON,
  });
  console.log("Created:", mc.name, created.points, created.reason);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
