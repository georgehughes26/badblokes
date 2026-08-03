import { TeamBadge } from "@/components/team-badge";
import { formatLondon } from "@/lib/time";
import type { PickRevealRow } from "@/lib/picks";

export function PicksReveal({ picks, currentUserId }: { picks: PickRevealRow[]; currentUserId: string }) {
  if (picks.length === 0) {
    return <p className="card text-center text-sm text-muted">No one else has picked yet.</p>;
  }

  return (
    <div className="card space-y-1 p-0">
      <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">
        Picks so far ({picks.length})
      </p>
      <div className="divide-y divide-border">
        {picks.map((pick) => {
          const isYou = pick.userId === currentUserId;
          return (
            <div
              key={pick.userId}
              className={["flex items-center justify-between gap-3 px-4 py-3", isYou ? "bg-accent/10" : ""].join(" ")}
            >
              <span className="flex min-w-0 items-center gap-3">
                <TeamBadge name={pick.teamName} shortName={pick.teamShortName} crestUrl={pick.teamCrestUrl} size="sm" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{pick.userName}</span>
                    {isYou && <span className="pill-green shrink-0">You</span>}
                    {pick.isJoker && <span className="pill-amber shrink-0">Joker</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">{pick.teamName}</span>
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted">{formatLondon(pick.createdAt, "EEE, HH:mm")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
