"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/current-user";
import { logAudit } from "@/lib/audit";
import { computeGameweekDeadlines, parseLondonDatetimeLocal } from "@/lib/time";
import {
  createGameweekSchema,
  createSeasonSchema,
  createTeamSchema,
  gameweekDeadlinesSchema,
  gameweekStatusSchema,
  gotmPayoutSchema,
  gotmStakePaidSchema,
  batchFinesPaidSchema,
} from "@/lib/validation/admin";
import { firstWeekOfBatch, GOTM_BATCH_SIZE } from "@/lib/standings";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function issueMessage(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Invalid input";
}

export async function createTeam(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = createTeamSchema.safeParse({
    name: formData.get("name"),
    shortName: formData.get("shortName"),
    crestUrl: formData.get("crestUrl"),
  });
  if (!parsed.success) fail("/admin/teams", issueMessage(parsed.error.issues));

  try {
    const team = await prisma.team.create({
      data: {
        name: parsed.data.name,
        shortName: parsed.data.shortName,
        crestUrl: parsed.data.crestUrl || null,
      },
    });
    await logAudit({ actorId: admin.id, action: "CREATE", entityType: "Team", entityId: team.id, after: team });
  } catch {
    fail("/admin/teams", "A team with that name already exists");
  }

  revalidatePath("/admin/teams");
  redirect("/admin/teams?success=Team%20added");
}

export async function setTeamActive(formData: FormData) {
  const admin = await requireAdmin();
  const teamId = String(formData.get("teamId") ?? "");
  const active = formData.get("active") === "true";
  const before = await prisma.team.findUnique({ where: { id: teamId } });
  if (!before) fail("/admin/teams", "Team not found");

  const after = await prisma.team.update({ where: { id: teamId }, data: { active } });
  await logAudit({ actorId: admin.id, action: "UPDATE", entityType: "Team", entityId: teamId, before, after });

  revalidatePath("/admin/teams");
}

export async function createSeason(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = createSeasonSchema.safeParse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    jokerSplitDate: formData.get("jokerSplitDate"),
  });
  if (!parsed.success) fail("/admin/seasons", issueMessage(parsed.error.issues));

  const { name, startDate, endDate, jokerSplitDate } = parsed.data;
  const season = await prisma.season.create({
    data: {
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      jokerSplitDate: new Date(jokerSplitDate),
    },
  });
  await logAudit({ actorId: admin.id, action: "CREATE", entityType: "Season", entityId: season.id, after: season });

  revalidatePath("/admin/seasons");
  redirect("/admin/seasons?success=Season%20created");
}

export async function setSeasonActive(formData: FormData) {
  const admin = await requireAdmin();
  const seasonId = String(formData.get("seasonId") ?? "");
  const before = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!before) fail("/admin/seasons", "Season not found");

  // Only one season is active at a time.
  await prisma.$transaction([
    prisma.season.updateMany({ data: { active: false }, where: { active: true } }),
    prisma.season.update({ where: { id: seasonId }, data: { active: true } }),
  ]);
  await logAudit({
    actorId: admin.id,
    action: "ACTIVATE",
    entityType: "Season",
    entityId: seasonId,
    before,
    after: { active: true },
  });

  revalidatePath("/admin/seasons");
}

export async function createGameweek(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = createGameweekSchema.safeParse({
    seasonId: formData.get("seasonId"),
    weekNumber: formData.get("weekNumber"),
    kickoffDate: formData.get("kickoffDate"),
  });
  if (!parsed.success) fail("/admin/gameweeks", issueMessage(parsed.error.issues));

  const { seasonId, weekNumber, kickoffDate } = parsed.data;
  const [year, month, day] = kickoffDate.split("-").map(Number);

  let deadlines;
  try {
    deadlines = computeGameweekDeadlines(year, month, day);
  } catch {
    fail("/admin/gameweeks", "That's not a valid date");
  }

  try {
    const gameweek = await prisma.gameweek.create({
      data: {
        seasonId,
        weekNumber,
        picksOpenAt: deadlines.picksOpenAt,
        pickDeadlineAt: deadlines.pickDeadlineAt,
        slipDeadlineAt: deadlines.slipDeadlineAt,
        status: "UPCOMING",
      },
    });
    await logAudit({
      actorId: admin.id,
      action: "CREATE",
      entityType: "Gameweek",
      entityId: gameweek.id,
      after: gameweek,
    });
  } catch {
    fail("/admin/gameweeks", "That season already has a gameweek with that week number");
  }

  revalidatePath("/admin/gameweeks");
  redirect("/admin/gameweeks?success=Gameweek%20created");
}

export async function updateGameweekStatus(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = gameweekStatusSchema.safeParse({
    gameweekId: formData.get("gameweekId"),
    status: formData.get("status"),
  });
  if (!parsed.success) fail("/admin/gameweeks", issueMessage(parsed.error.issues));

  const { gameweekId, status } = parsed.data;
  const before = await prisma.gameweek.findUnique({ where: { id: gameweekId } });
  if (!before) fail("/admin/gameweeks", "Gameweek not found");

  const after = await prisma.gameweek.update({ where: { id: gameweekId }, data: { status } });
  await logAudit({
    actorId: admin.id,
    action: "STATUS_CHANGE",
    entityType: "Gameweek",
    entityId: gameweekId,
    before: { status: before.status },
    after: { status: after.status },
  });

  revalidatePath("/admin/gameweeks");
  revalidatePath(`/admin/gameweeks/${gameweekId}`);
}

export async function updateGameweekDeadlines(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = gameweekDeadlinesSchema.safeParse({
    gameweekId: formData.get("gameweekId"),
    picksOpenAt: formData.get("picksOpenAt"),
    pickDeadlineAt: formData.get("pickDeadlineAt"),
    slipDeadlineAt: formData.get("slipDeadlineAt"),
  });
  if (!parsed.success) {
    fail(`/admin/gameweeks/${formData.get("gameweekId")}`, issueMessage(parsed.error.issues));
  }

  const { gameweekId, picksOpenAt, pickDeadlineAt, slipDeadlineAt } = parsed.data;
  const before = await prisma.gameweek.findUnique({ where: { id: gameweekId } });
  if (!before) fail("/admin/gameweeks", "Gameweek not found");

  const after = await prisma.gameweek.update({
    where: { id: gameweekId },
    data: {
      picksOpenAt: parseLondonDatetimeLocal(picksOpenAt),
      pickDeadlineAt: parseLondonDatetimeLocal(pickDeadlineAt),
      slipDeadlineAt: parseLondonDatetimeLocal(slipDeadlineAt),
    },
  });
  await logAudit({
    actorId: admin.id,
    action: "DEADLINE_OVERRIDE",
    entityType: "Gameweek",
    entityId: gameweekId,
    before: {
      picksOpenAt: before.picksOpenAt,
      pickDeadlineAt: before.pickDeadlineAt,
      slipDeadlineAt: before.slipDeadlineAt,
    },
    after: {
      picksOpenAt: after.picksOpenAt,
      pickDeadlineAt: after.pickDeadlineAt,
      slipDeadlineAt: after.slipDeadlineAt,
    },
  });

  revalidatePath(`/admin/gameweeks/${gameweekId}`);
  redirect(`/admin/gameweeks/${gameweekId}?success=Deadlines%20updated`);
}

// ---------------------------------------------------------------------------
// GOTM money — per-batch settlement (see lib/batch-settlement.ts)
// ---------------------------------------------------------------------------

export async function setGotmStakePaid(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = gotmStakePaidSchema.safeParse({
    seasonId: formData.get("seasonId"),
    batchNumber: formData.get("batchNumber"),
    userId: formData.get("userId"),
    paid: formData.get("paid"),
  });
  if (!parsed.success) fail("/admin/fines", issueMessage(parsed.error.issues));
  const { seasonId, batchNumber, userId, paid } = parsed.data;

  await prisma.gotmStakePayment.upsert({
    where: { seasonId_batchNumber_userId: { seasonId, batchNumber, userId } },
    create: { seasonId, batchNumber, userId, paid, paidAt: paid ? new Date() : null, recordedById: admin.id },
    update: { paid, paidAt: paid ? new Date() : null, recordedById: admin.id },
  });
  await logAudit({
    actorId: admin.id,
    action: paid ? "MARK_PAID" : "MARK_UNPAID",
    entityType: "GotmStakePayment",
    entityId: `${seasonId}:${batchNumber}:${userId}`,
    after: { paid },
  });

  revalidatePath("/admin/fines");
}

export async function setGotmPaidOut(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = gotmPayoutSchema.safeParse({
    seasonId: formData.get("seasonId"),
    batchNumber: formData.get("batchNumber"),
    outcome: formData.get("outcome"),
  });
  if (!parsed.success) fail("/admin/fines", issueMessage(parsed.error.issues));
  const { seasonId, batchNumber, outcome } = parsed.data;

  if (outcome === "none") {
    await prisma.gotmBatchPayout.deleteMany({ where: { seasonId, batchNumber } });
  } else {
    const rolledToPot = outcome === "pot";
    await prisma.gotmBatchPayout.upsert({
      where: { seasonId_batchNumber: { seasonId, batchNumber } },
      create: { seasonId, batchNumber, rolledToPot, recordedById: admin.id },
      update: { paidOutAt: new Date(), rolledToPot, recordedById: admin.id },
    });
  }
  await logAudit({
    actorId: admin.id,
    action: outcome === "none" ? "MARK_UNPAID" : "MARK_PAID",
    entityType: "GotmBatchPayout",
    entityId: `${seasonId}:${batchNumber}`,
    after: { outcome },
  });

  revalidatePath("/admin/fines");
  revalidatePath("/fines");
}

export async function setBatchFinesPaid(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = batchFinesPaidSchema.safeParse({
    seasonId: formData.get("seasonId"),
    batchNumber: formData.get("batchNumber"),
    userId: formData.get("userId"),
    paid: formData.get("paid"),
  });
  if (!parsed.success) fail("/admin/fines", issueMessage(parsed.error.issues));
  const { seasonId, batchNumber, userId, paid } = parsed.data;

  const first = firstWeekOfBatch(batchNumber);
  const batchWeeks = Array.from({ length: GOTM_BATCH_SIZE }, (_, i) => first + i);

  const result = await prisma.fineLedgerEntry.updateMany({
    where: { userId, gameweek: { seasonId, weekNumber: { in: batchWeeks } } },
    data: { paid, paidAt: paid ? new Date() : null, recordedById: admin.id },
  });
  await logAudit({
    actorId: admin.id,
    action: paid ? "MARK_PAID" : "MARK_UNPAID",
    entityType: "FineLedgerEntry",
    entityId: `${seasonId}:batch${batchNumber}:${userId}`,
    after: { paid, entriesUpdated: result.count, weeks: batchWeeks },
  });

  revalidatePath("/admin/fines");
  revalidatePath("/fines");
}
