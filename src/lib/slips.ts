import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";

export interface SlipView {
  kind: "pick" | "no-pick";
  token: string;
  externalUrl: string | null;
  submittedAt: Date | null;
  deadlinePassed: boolean;
  userName: string;
  seasonName: string;
  weekNumber: number;
  slipDeadlineAt: Date;
  team: { name: string; shortName: string; crestUrl: string | null } | null;
}

/**
 * Look up a slip by its unguessable token, with everything the /slip page
 * needs to render — whichever of the two slip types it turns out to be. A
 * BetSlip belongs to an actual Pick; a NoPickSlip is for a player who never
 * logged a pick in the app but still wants to prove they placed a real bet
 * (see rules.ts — this voids the no-pick penalty instead of exempting them
 * from it outright).
 */
export async function getSlipByToken(token: string): Promise<SlipView | null> {
  const betSlip = await prisma.betSlip.findUnique({
    where: { token },
    include: {
      pick: {
        include: {
          user: true,
          team: true,
          gameweek: { include: { season: true } },
        },
      },
    },
  });
  if (betSlip) {
    return {
      kind: "pick",
      token: betSlip.token,
      externalUrl: betSlip.externalUrl,
      submittedAt: betSlip.submittedAt,
      deadlinePassed: Date.now() >= betSlip.pick.gameweek.slipDeadlineAt.getTime(),
      userName: betSlip.pick.user.name,
      seasonName: betSlip.pick.gameweek.season.name,
      weekNumber: betSlip.pick.gameweek.weekNumber,
      slipDeadlineAt: betSlip.pick.gameweek.slipDeadlineAt,
      team: {
        name: betSlip.pick.team.name,
        shortName: betSlip.pick.team.shortName,
        crestUrl: betSlip.pick.team.crestUrl,
      },
    };
  }

  const noPickSlip = await prisma.noPickSlip.findUnique({
    where: { token },
    include: { user: true, gameweek: { include: { season: true } } },
  });
  if (!noPickSlip) return null;

  return {
    kind: "no-pick",
    token: noPickSlip.token,
    externalUrl: noPickSlip.externalUrl,
    submittedAt: noPickSlip.submittedAt,
    deadlinePassed: Date.now() >= noPickSlip.gameweek.slipDeadlineAt.getTime(),
    userName: noPickSlip.user.name,
    seasonName: noPickSlip.gameweek.season.name,
    weekNumber: noPickSlip.gameweek.weekNumber,
    slipDeadlineAt: noPickSlip.gameweek.slipDeadlineAt,
    team: null,
  };
}

/**
 * The slip a no-pick player uses to submit proof of a real bet, creating it
 * on first visit. Idempotent — safe to call every time the home page
 * renders for a player with no pick this gameweek.
 */
export async function getOrCreateNoPickSlip(gameweekId: string, userId: string) {
  const existing = await prisma.noPickSlip.findUnique({
    where: { gameweekId_userId: { gameweekId, userId } },
  });
  if (existing) return existing;

  return prisma.noPickSlip.create({
    data: { gameweekId, userId, token: nanoid(24) },
  });
}
