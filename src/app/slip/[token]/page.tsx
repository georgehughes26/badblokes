import { notFound } from "next/navigation";
import { getSlipByToken } from "@/lib/slips";
import { formatLondon } from "@/lib/time";
import { TeamBadge } from "@/components/team-badge";
import { SlipForm } from "@/components/slip-form";

export default async function SlipPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const slip = await getSlipByToken(token);
  if (!slip) notFound();

  return (
    <div className="mx-auto w-full max-w-sm space-y-4">
      <div className="card flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {slip.seasonName} — Gameweek {slip.weekNumber}
        </p>
        {slip.team ? (
          <>
            <TeamBadge name={slip.team.name} shortName={slip.team.shortName} crestUrl={slip.team.crestUrl} />
            <p className="font-display text-2xl font-bold">{slip.userName}</p>
            <p className="text-sm text-muted">picked {slip.team.name}</p>
          </>
        ) : (
          <>
            <p className="font-display text-2xl font-bold">{slip.userName}</p>
            <p className="text-sm text-muted">No team picked this week — proof of a real bet still counts.</p>
          </>
        )}
        <p className="text-xs text-muted">Slip deadline {formatLondon(slip.slipDeadlineAt)}</p>
      </div>

      {slip.deadlinePassed ? (
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
