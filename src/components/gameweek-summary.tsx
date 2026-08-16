import Link from "next/link";
import { TeamBadge } from "@/components/team-badge";
import { formatLondon } from "@/lib/time";
import type { GameweekSummary, GameweekSummaryRow } from "@/lib/gameweek-summary";

function outcomeColor(label: string | null): string {
  if (label === "Won" || label === "Won (EP)") return "text-accent";
  if (label === "Lost") return "text-danger";
  return "text-muted";
}

export function GameweekSummaryView({ summary, currentUserId }: { summary: GameweekSummary; currentUserId: string }) {
  const { settled, rows, winnersCount, totalFines } = summary;

  return (
    <div className="space-y-4">
      <div className="card space-y-1.5 py-6 text-center">
        {settled ? <p className="pill-green mx-auto w-fit">Settled</p> : <p className="pill-amber mx-auto w-fit">In play</p>}
        {!settled && <p className="mt-1 text-sm text-muted">Games are underway — check back once full-time results are in.</p>}
        {settled && (
          <p className="text-sm text-muted">
            <span className="font-semibold text-foreground">
              {winnersCount} {winnersCount === 1 ? "winner" : "winners"}
            </span>{" "}
            this week
          </p>
        )}
        {settled && totalFines > 0 && (
          <p className="text-sm text-muted">
            <span className="font-semibold text-danger">£{totalFines}</span> added to the pot this week
          </p>
        )}
      </div>

      <div className="card space-y-1 p-0">
        <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">
          {settled ? "Results" : "Picks"} ({rows.length})
        </p>
        <div className="divide-y divide-border">
          {rows.map((row: GameweekSummaryRow) => {
            const isYou = row.userId === currentUserId;
            const rowBg = isYou ? "bg-accent/10" : undefined;
            return (
              <div key={row.userId} className={["flex items-center justify-between gap-3 px-4 py-3", rowBg].filter(Boolean).join(" ")}>
                <span className="flex min-w-0 items-center gap-3">
                  {row.hasPick ? (
                    <TeamBadge name={row.teamName!} shortName={row.teamShortName!} crestUrl={row.teamCrestUrl} size="sm" />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-xs text-muted">
                      —
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{row.userName}</span>
                      {isYou && <span className="pill-green shrink-0">You</span>}
                      {row.isJoker && <span className="pill-amber shrink-0">Joker</span>}
                    </span>
                    <span className="block truncate text-xs text-muted">{row.hasPick ? row.teamName : "No pick"}</span>
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs">
                  {settled ? (
                    <>
                      <span className={outcomeColor(row.outcomeLabel)}>{row.outcomeLabel}</span>
                      {row.points !== null && (
                        <span className="font-display block text-sm font-bold">
                          {row.points > 0 ? `+${row.points}` : row.points} pts
                        </span>
                      )}
                      {row.fineAmount !== null && row.fineAmount > 0 && <span className="block text-danger">£{row.fineAmount}</span>}
                    </>
                  ) : (
                    <span className="text-muted">{row.pickedAt ? formatLondon(row.pickedAt, "EEE, HH:mm") : ""}</span>
                  )}
                </span>
              </div>
            );
          })}
          {rows.length === 0 && <p className="px-4 pb-4 text-sm text-muted">No picks were made this gameweek.</p>}
        </div>
      </div>

      {settled && (
        <Link href="/league-table" className="btn-secondary flex w-full items-center justify-center">
          See the updated table
        </Link>
      )}
    </div>
  );
}
