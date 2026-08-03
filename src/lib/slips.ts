import { prisma } from "@/lib/prisma";

/** Look up a bet slip by its unguessable token, with everything the /slip page needs to render. */
export async function getSlipByToken(token: string) {
  const slip = await prisma.betSlip.findUnique({
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
  if (!slip) return null;

  return { slip, deadlinePassed: Date.now() >= slip.pick.gameweek.slipDeadlineAt.getTime() };
}
