import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { logAudit } from "@/lib/audit";
import { settlePlayerGameweek, type PlayerGameweekInput } from "@/lib/rules";
import { saveResultsSchema } from "@/lib/validation/results";

const NO_PICK_INPUT: PlayerGameweekInput = {
  hasPick: false,
  isJoker: false,
  shortOdds: false,
  slipSubmitted: false,
  won: false,
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = saveResultsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { gameweekId, picks: submittedFacts, noPickSlips } = parsed.data;

  const gameweek = await prisma.gameweek.findUnique({
    where: { id: gameweekId },
    include: { picks: { include: { betSlip: true } }, noPickSlips: true },
  });
  if (!gameweek) {
    return NextResponse.json({ error: "Gameweek not found" }, { status: 404 });
  }

  const factByPickId = new Map(submittedFacts.map((f) => [f.pickId, f]));
  const slipSubmittedByUserId = new Map(noPickSlips.map((s) => [s.userId, s.slipSubmitted]));
  const noPickSlipByUserId = new Map(gameweek.noPickSlips.map((s) => [s.userId, s]));
  // Only PLAYER-role users are subject to the automatic no-pick penalty —
  // an admin who isn't in the pool themselves shouldn't get auto-fined for
  // not picking. An admin who *does* play still gets settled normally via
  // their entry in gameweek.picks below.
  const allActivePlayers = await prisma.user.findMany({ where: { active: true, role: "PLAYER" } });
  const pickedUserIds = new Set(gameweek.picks.map((p) => p.userId));

  await prisma.$transaction(async (tx) => {
    for (const pick of gameweek.picks) {
      const fact = factByPickId.get(pick.id);
      if (!fact) continue;

      const outcome = settlePlayerGameweek({
        hasPick: true,
        isJoker: pick.isJoker,
        shortOdds: fact.shortOdds,
        slipSubmitted: fact.slipSubmitted,
        won: fact.won || fact.wentTwoUp,
      });

      await tx.pick.update({
        where: { id: pick.id },
        data: {
          resultWon: fact.won,
          resultWentTwoUp: fact.wentTwoUp,
          resultShortOdds: fact.shortOdds,
          resultEnteredAt: new Date(),
        },
      });

      if (pick.betSlip) {
        await tx.betSlip.update({
          where: { id: pick.betSlip.id },
          data: { submittedAt: fact.slipSubmitted ? (pick.betSlip.submittedAt ?? new Date()) : null },
        });
      }

      await tx.result.upsert({
        where: { gameweekId_userId: { gameweekId, userId: pick.userId } },
        create: {
          gameweekId,
          userId: pick.userId,
          points: outcome.points,
          breachNoPick: outcome.breaches.noPick,
          breachNoSlip: outcome.breaches.noSlip,
          breachShortOdds: outcome.breaches.shortOdds,
          breachTeamLost: outcome.breaches.teamLost,
          breachJokerLost: outcome.breaches.jokerLost,
          fineAmount: outcome.fine.amount,
          fineRuleId: outcome.fine.ruleId,
          fineReason: outcome.fine.reason,
          jokerPlayed: outcome.jokerPlayed,
        },
        update: {
          points: outcome.points,
          breachNoPick: outcome.breaches.noPick,
          breachNoSlip: outcome.breaches.noSlip,
          breachShortOdds: outcome.breaches.shortOdds,
          breachTeamLost: outcome.breaches.teamLost,
          breachJokerLost: outcome.breaches.jokerLost,
          fineAmount: outcome.fine.amount,
          fineRuleId: outcome.fine.ruleId,
          fineReason: outcome.fine.reason,
          jokerPlayed: outcome.jokerPlayed,
          computedAt: new Date(),
        },
      });

      if (outcome.fine.amount > 0) {
        await tx.fineLedgerEntry.upsert({
          where: { gameweekId_userId: { gameweekId, userId: pick.userId } },
          create: { gameweekId, userId: pick.userId, amount: outcome.fine.amount, reason: outcome.fine.reason },
          update: { amount: outcome.fine.amount, reason: outcome.fine.reason },
        });
      } else {
        await tx.fineLedgerEntry.deleteMany({ where: { gameweekId, userId: pick.userId } });
      }
    }

    for (const activeUser of allActivePlayers) {
      if (pickedUserIds.has(activeUser.id)) continue;
      const slipSubmitted = slipSubmittedByUserId.get(activeUser.id) ?? false;
      const outcome = settlePlayerGameweek({ ...NO_PICK_INPUT, slipSubmitted });

      const noPickSlip = noPickSlipByUserId.get(activeUser.id);
      if (noPickSlip) {
        await tx.noPickSlip.update({
          where: { id: noPickSlip.id },
          data: { submittedAt: slipSubmitted ? (noPickSlip.submittedAt ?? new Date()) : null },
        });
      }

      await tx.result.upsert({
        where: { gameweekId_userId: { gameweekId, userId: activeUser.id } },
        create: {
          gameweekId,
          userId: activeUser.id,
          points: outcome.points,
          breachNoPick: outcome.breaches.noPick,
          breachNoSlip: outcome.breaches.noSlip,
          breachShortOdds: outcome.breaches.shortOdds,
          breachTeamLost: outcome.breaches.teamLost,
          breachJokerLost: outcome.breaches.jokerLost,
          fineAmount: outcome.fine.amount,
          fineRuleId: outcome.fine.ruleId,
          fineReason: outcome.fine.reason,
          jokerPlayed: outcome.jokerPlayed,
        },
        update: {
          points: outcome.points,
          breachNoPick: outcome.breaches.noPick,
          breachNoSlip: outcome.breaches.noSlip,
          breachShortOdds: outcome.breaches.shortOdds,
          breachTeamLost: outcome.breaches.teamLost,
          breachJokerLost: outcome.breaches.jokerLost,
          fineAmount: outcome.fine.amount,
          fineRuleId: outcome.fine.ruleId,
          fineReason: outcome.fine.reason,
          jokerPlayed: outcome.jokerPlayed,
          computedAt: new Date(),
        },
      });

      if (outcome.fine.amount > 0) {
        await tx.fineLedgerEntry.upsert({
          where: { gameweekId_userId: { gameweekId, userId: activeUser.id } },
          create: { gameweekId, userId: activeUser.id, amount: outcome.fine.amount, reason: outcome.fine.reason },
          update: { amount: outcome.fine.amount, reason: outcome.fine.reason },
        });
      } else {
        await tx.fineLedgerEntry.deleteMany({ where: { gameweekId, userId: activeUser.id } });
      }
    }

    await tx.gameweek.update({ where: { id: gameweekId }, data: { status: "SETTLED", settledAt: new Date() } });
  });

  await logAudit({
    actorId: user.id,
    action: "SETTLE",
    entityType: "Gameweek",
    entityId: gameweekId,
    after: { pickCount: gameweek.picks.length },
  });

  return NextResponse.json({ ok: true });
}
