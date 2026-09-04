// One-off: the two "First To Leave" forfeits. Safe to re-run — finds an
// existing adjustment for the same user+reason instead of duplicating one.
//   npx tsx scripts/seed-points-adjustments.ts
//
// Tom's is a current-season penalty (2026-27) — it should show up in this
// season's League Table points and flow through into his All Time total.
// (Turned out a -1 already existed for him from 16 Aug under a vaguer
// reason, "Carried over from a separate matter" — that got renamed to
// "First To Leave 2026" rather than adding a second -1 on top of it.)
// Matty Parsons' is pre-app (2025) — it should only move his All Time
// total, never touch his 2026-27 season points, so it's a
// HistoricPointsAdjustment rather than a season-scoped PointsAdjustment.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { logAudit } from "../src/lib/audit";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({ where: { username: "george", role: "ADMIN" } });
  if (!admin) throw new Error("admin 'george' not found");

  const season = await prisma.season.findFirst({ where: { active: true } });
  if (!season) throw new Error("no active season");

  const tom = await prisma.user.findUnique({ where: { username: "TICKER" } });
  if (!tom) throw new Error("Tom (TICKER) not found");

  const mattyP = await prisma.user.findUnique({ where: { username: "MattyP" } });
  if (!mattyP) throw new Error("Matty Parsons (MattyP) not found");

  const existingSeasonAdjustment = await prisma.pointsAdjustment.findFirst({
    where: { seasonId: season.id, userId: tom.id, reason: "First To Leave 2026" },
  });
  if (!existingSeasonAdjustment) {
    const created = await prisma.pointsAdjustment.create({
      data: { seasonId: season.id, userId: tom.id, points: -1, reason: "First To Leave 2026" },
    });
    await logAudit({
      actorId: admin.id,
      action: "CREATE",
      entityType: "PointsAdjustment",
      entityId: created.id,
      after: created,
      reason: "First To Leave 2026 forfeit",
    });
    console.log("Season adjustment created:", tom.name, created.points, created.reason);
  } else {
    console.log("Season adjustment already exists:", tom.name, existingSeasonAdjustment.points, existingSeasonAdjustment.reason);
  }

  const existingHistoricAdjustment = await prisma.historicPointsAdjustment.findFirst({
    where: { userId: mattyP.id, reason: "First To Leave 2025" },
  });
  if (!existingHistoricAdjustment) {
    const created = await prisma.historicPointsAdjustment.create({
      data: { userId: mattyP.id, points: -1, reason: "First To Leave 2025" },
    });
    await logAudit({
      actorId: admin.id,
      action: "CREATE",
      entityType: "HistoricPointsAdjustment",
      entityId: created.id,
      after: created,
      reason: "First To Leave 2025 forfeit",
    });
    console.log("Historic adjustment created:", mattyP.name, created.points, created.reason);
  } else {
    console.log(
      "Historic adjustment already exists:",
      mattyP.name,
      existingHistoricAdjustment.points,
      existingHistoricAdjustment.reason,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
