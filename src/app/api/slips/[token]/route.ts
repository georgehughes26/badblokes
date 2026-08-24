import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitSlipSchema } from "@/lib/validation/slips";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const body = await request.json().catch(() => null);
  const parsed = submitSlipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  // The token itself is the auth here — it's unguessable and shown only to
  // the player it belongs to. No session required. A token may belong to
  // either an actual pick's BetSlip or a no-pick player's NoPickSlip (proof
  // of a real bet placed outside the app — see rules.ts's `voided` outcome).
  const betSlip = await prisma.betSlip.findUnique({
    where: { token },
    include: { pick: { include: { gameweek: true } } },
  });
  if (betSlip) {
    if (Date.now() >= betSlip.pick.gameweek.slipDeadlineAt.getTime()) {
      return NextResponse.json({ error: "The slip deadline for this gameweek has passed" }, { status: 403 });
    }
    const updated = await prisma.betSlip.update({
      where: { token },
      data: { externalUrl: parsed.data.externalUrl, submittedAt: new Date() },
    });
    return NextResponse.json({ ok: true, submittedAt: updated.submittedAt, externalUrl: updated.externalUrl });
  }

  const noPickSlip = await prisma.noPickSlip.findUnique({ where: { token }, include: { gameweek: true } });
  if (!noPickSlip) {
    return NextResponse.json({ error: "That slip link isn't valid" }, { status: 404 });
  }
  if (Date.now() >= noPickSlip.gameweek.slipDeadlineAt.getTime()) {
    return NextResponse.json({ error: "The slip deadline for this gameweek has passed" }, { status: 403 });
  }
  const updated = await prisma.noPickSlip.update({
    where: { token },
    data: { externalUrl: parsed.data.externalUrl, submittedAt: new Date() },
  });
  return NextResponse.json({ ok: true, submittedAt: updated.submittedAt, externalUrl: updated.externalUrl });
}
