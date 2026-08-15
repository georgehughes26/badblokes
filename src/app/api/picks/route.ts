import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPreviousGameweekPickTeamId, getPreviousJokerHalves, hasEveryonePicked } from "@/lib/picks";
import { isTeamOnCooldown } from "@/lib/cooldown";
import { canPlayJoker, getJokerHalf } from "@/lib/jokers";
import { deriveGameweekPhase } from "@/lib/gameweek-phase";
import { submitPickSchema, updatePickSchema } from "@/lib/validation/picks";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You need to log in first" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = submitPickSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { gameweekId, teamId, isJoker } = parsed.data;

  const gameweek = await prisma.gameweek.findUnique({
    where: { id: gameweekId },
    include: { season: true },
  });
  if (!gameweek) {
    return NextResponse.json({ error: "Gameweek not found" }, { status: 404 });
  }

  // Hard-enforced window — never trust the client clock, and there's no
  // "late but not yet locked" grace period. Server time only. Phase is
  // derived from the clock (see lib/gameweek-phase.ts), so this closes
  // automatically at the deadline without needing an admin to lock it.
  const now = new Date();
  if (deriveGameweekPhase(gameweek, now) !== "OPEN") {
    return NextResponse.json({ error: "Picks are closed for this gameweek" }, { status: 403 });
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || !team.active) {
    return NextResponse.json({ error: "That team isn't available to pick" }, { status: 400 });
  }

  const previousPickTeamId = await getPreviousGameweekPickTeamId(user.id, gameweek.seasonId, gameweek.weekNumber);
  if (isTeamOnCooldown(previousPickTeamId, teamId)) {
    return NextResponse.json(
      { error: "You picked this team last gameweek — give it a week off" },
      { status: 400 },
    );
  }

  if (isJoker) {
    const previousJokerHalves = await getPreviousJokerHalves(
      user.id,
      gameweek.seasonId,
      gameweek.season.jokerSplitDate,
      gameweek.id,
    );
    const targetHalf = getJokerHalf(gameweek.pickDeadlineAt, gameweek.season.jokerSplitDate);
    if (!canPlayJoker(previousJokerHalves, targetHalf)) {
      return NextResponse.json(
        { error: "You've already played your joker for this half of the season" },
        { status: 400 },
      );
    }
  }

  try {
    const { pick, slipToken } = await prisma.$transaction(async (tx) => {
      const created = await tx.pick.create({
        data: {
          gameweekId,
          userId: user.id,
          teamId,
          isJoker,
        },
      });
      const token = nanoid(24);
      await tx.betSlip.create({ data: { pickId: created.id, token } });
      return { pick: created, slipToken: token };
    });

    return NextResponse.json(
      {
        ok: true,
        pickId: pick.id,
        teamName: team.name,
        isJoker,
        slipToken,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = (err.meta?.target as string[] | string | undefined) ?? "";
      const targetStr = Array.isArray(target) ? target.join(",") : String(target);
      if (targetStr.includes("teamId")) {
        return NextResponse.json(
          { error: `Sorry — ${team.name} was just taken. Pick again.` },
          { status: 409 },
        );
      }
      if (targetStr.includes("userId")) {
        return NextResponse.json({ error: "You've already made a pick this gameweek" }, { status: 409 });
      }
      return NextResponse.json({ error: "That pick conflicts with an existing one" }, { status: 409 });
    }
    throw err;
  }
}

/**
 * Edit an already-locked-in pick while its gameweek is still OPEN: change
 * the joker flag any time, or the team itself once every active player has
 * picked (so reshuffling never gives anyone an information edge — every
 * pick is already public by then).
 */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You need to log in first" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updatePickSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { pickId, teamId, isJoker } = parsed.data;

  const pick = await prisma.pick.findUnique({
    where: { id: pickId },
    include: { gameweek: { include: { season: true } } },
  });
  if (!pick) {
    return NextResponse.json({ error: "Pick not found" }, { status: 404 });
  }
  if (pick.userId !== user.id) {
    return NextResponse.json({ error: "That's not your pick" }, { status: 403 });
  }

  const now = new Date();
  if (deriveGameweekPhase(pick.gameweek, now) !== "OPEN") {
    return NextResponse.json({ error: "Picks are locked for this gameweek" }, { status: 403 });
  }

  const data: { teamId?: string; isJoker?: boolean } = {};
  let teamName: string | null = null;

  if (teamId !== undefined && teamId !== pick.teamId) {
    const gameweekPicks = await prisma.pick.findMany({
      where: { gameweekId: pick.gameweekId },
      select: { userId: true, teamId: true },
    });
    const pickedUserIds = new Set(gameweekPicks.map((p) => p.userId));
    if (!(await hasEveryonePicked(pickedUserIds))) {
      return NextResponse.json({ error: "You can only change teams once everyone has picked" }, { status: 403 });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || !team.active) {
      return NextResponse.json({ error: "That team isn't available to pick" }, { status: 400 });
    }
    const takenBy = gameweekPicks.find((p) => p.teamId === teamId && p.userId !== user.id);
    if (takenBy) {
      return NextResponse.json({ error: `Sorry — ${team.name} is already taken.` }, { status: 409 });
    }
    const previousPickTeamId = await getPreviousGameweekPickTeamId(
      user.id,
      pick.gameweek.seasonId,
      pick.gameweek.weekNumber,
    );
    if (isTeamOnCooldown(previousPickTeamId, teamId)) {
      return NextResponse.json(
        { error: "You picked this team last gameweek — give it a week off" },
        { status: 400 },
      );
    }
    data.teamId = teamId;
    teamName = team.name;
  }

  if (isJoker !== undefined && isJoker !== pick.isJoker) {
    if (isJoker) {
      const previousJokerHalves = await getPreviousJokerHalves(
        user.id,
        pick.gameweek.seasonId,
        pick.gameweek.season.jokerSplitDate,
        pick.gameweekId,
      );
      const targetHalf = getJokerHalf(pick.gameweek.pickDeadlineAt, pick.gameweek.season.jokerSplitDate);
      if (!canPlayJoker(previousJokerHalves, targetHalf)) {
        return NextResponse.json(
          { error: "You've already played your joker for this half of the season" },
          { status: 400 },
        );
      }
    }
    data.isJoker = isJoker;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true, teamName: null, isJoker: pick.isJoker });
  }

  try {
    const updated = await prisma.pick.update({ where: { id: pickId }, data, include: { team: true } });
    return NextResponse.json({ ok: true, teamName: updated.team.name, isJoker: updated.isJoker });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: `Sorry — ${teamName ?? "that team"} was just taken. Pick again.` }, { status: 409 });
    }
    throw err;
  }
}
