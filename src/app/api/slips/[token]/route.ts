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

  const slip = await prisma.betSlip.findUnique({
    where: { token },
    include: { pick: { include: { gameweek: true } } },
  });
  if (!slip) {
    return NextResponse.json({ error: "That slip link isn't valid" }, { status: 404 });
  }

  // The token itself is the auth here — it's unguessable and texted/shown
  // only to the player who made the pick. No session required.
  if (Date.now() >= slip.pick.gameweek.slipDeadlineAt.getTime()) {
    return NextResponse.json({ error: "The slip deadline for this gameweek has passed" }, { status: 403 });
  }

  const updated = await prisma.betSlip.update({
    where: { token },
    data: { externalUrl: parsed.data.externalUrl, submittedAt: new Date() },
  });

  return NextResponse.json({ ok: true, submittedAt: updated.submittedAt, externalUrl: updated.externalUrl });
}
