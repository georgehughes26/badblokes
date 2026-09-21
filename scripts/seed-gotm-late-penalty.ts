// One-off: -1 points for Matty Parsons — he sent his GOTM 1 payment in
// late. Same shape as the "First To Leave" adjustments in
// seed-points-adjustments.ts: a season-scoped PointsAdjustment, so it moves
// this season's League Table points (and flows into his All Time total)
// without touching the GOTM 1 batch table itself, which never carries
// manual adjustments. Safe to re-run — finds an existing adjustment for the
// same user+reason instead of duplicating one.
//   npx tsx scripts/seed-gotm-late-penalty.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { logAudit } from "../src/lib/audit";

const prisma = new PrismaClient();
const REASON = "GOTM 1 — paid late";

async function main() {
  const admin = await prisma.user.findFirst({ where: { username: "george", role: "ADMIN" } });
  if (!admin) throw new Error("admin 'george' not found");

  const season = await prisma.season.findFirst({ where: { active: true } });
  if (!season) throw new Error("no active season");

  const mattyP = await prisma.user.findUnique({ where: { username: "MattyP" } });
  if (!mattyP) throw new Error("Matty Parsons (MattyP) not found");

  const existing = await prisma.pointsAdjustment.findFirst({
    where: { seasonId: season.id, userId: mattyP.id, reason: REASON },
  });
  if (existing) {
    console.log("Already exists:", mattyP.name, existing.points, existing.reason);
    return;
  }

  const created = await prisma.pointsAdjustment.create({
    data: { seasonId: season.id, userId: mattyP.id, points: -1, reason: REASON },
  });
  await logAudit({
    actorId: admin.id,
    action: "CREATE",
    entityType: "PointsAdjustment",
    entityId: created.id,
    after: created,
    reason: REASON,
  });
  console.log("Created:", mattyP.name, created.points, created.reason);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
