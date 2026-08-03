import { notFound } from "next/navigation";
import { getSlipByToken } from "@/lib/slips";
import { formatLondon } from "@/lib/time";
import { TeamBadge } from "@/components/team-badge";
import { SlipForm } from "@/components/slip-form";

export default async function SlipPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const result = await getSlipByToken(token);
  if (!result) notFound();
  const { slip, deadlinePassed } = result;
  const { pick } = slip;

  return (
    <div className="mx-auto w-full max-w-sm space-y-4">
      <div className="card flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {pick.gameweek.season.name} — Gameweek {pick.gameweek.weekNumber}
        </p>
        <TeamBadge name={pick.team.name} shortName={pick.team.shortName} crestUrl={pick.team.crestUrl} />
        <p className="font-display text-2xl font-bold">{pick.user.name}</p>
        <p className="text-sm text-muted">picked {pick.team.name}</p>
        <p className="text-xs text-muted">
          Slip deadline {formatLondon(pick.gameweek.slipDeadlineAt)}
        </p>
      </div>

      {deadlinePassed ? (
        <div className="card space-y-2 text-center">
          {slip.externalUrl ? (
            <>
              <p className="pill-green mx-auto w-fit">Slip submitted</p>
              <a
                href={slip.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="block break-all text-sm font-medium text-accent hover:underline"
              >
                {slip.externalUrl}
              </a>
            </>
          ) : (
            <p className="pill-red mx-auto w-fit">Deadline passed — no slip was submitted</p>
          )}
        </div>
      ) : (
        <SlipForm token={token} initialUrl={slip.externalUrl} />
      )}
    </div>
  );
}
