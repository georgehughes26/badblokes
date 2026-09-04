"use client";

import { useState } from "react";
import Link from "next/link";
import type { GotmBatch, StandingRow } from "@/lib/standings";
import { getGotmWinners } from "@/lib/standings";
import { StandingsTable } from "@/components/standings-table";

function weekRangeLabel(weekNumbers: number[]): string {
  if (weekNumbers.length === 0) return "Not started yet";
  const min = Math.min(...weekNumbers);
  const max = Math.max(...weekNumbers);
  return min === max ? `GW${min}` : `GW${min}-${max}`;
}

function winnersLabel(winners: StandingRow[]): string {
  if (winners.length === 0) return "";
  if (winners.length === 1) return winners[0].name;
  return winners.map((w) => w.name).join(", ");
}

export function TableSwitcher({
  season,
  gotmCurrent,
  gotmCompleted,
  currentUserId,
}: {
  season: StandingRow[];
  gotmCurrent: GotmBatch;
  gotmCompleted: GotmBatch[];
  currentUserId?: string;
}) {
  const [view, setView] = useState<"season" | "gotm">("season");

  return (
    <div className="space-y-4">
      <div className="flex w-full rounded-xl border border-border bg-surface p-1 sm:w-fit">
        <button
          type="button"
          onClick={() => setView("season")}
          className={`min-h-10 flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors sm:flex-none ${
            view === "season" ? "bg-accent text-black" : "text-muted hover:text-foreground"
          }`}
        >
          League Table
        </button>
        <button
          type="button"
          onClick={() => setView("gotm")}
          className={`min-h-10 flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors sm:flex-none ${
            view === "gotm" ? "bg-accent text-black" : "text-muted hover:text-foreground"
          }`}
        >
          Gambler of the Month
        </button>
      </div>

      {view === "season" ? (
        <StandingsTable rows={season} currentUserId={currentUserId} />
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              GOTM {gotmCurrent.batchNumber} — {weekRangeLabel(gotmCurrent.weekNumbers)}
            </p>
            <StandingsTable rows={gotmCurrent.rows} currentUserId={currentUserId} />
          </div>

          {gotmCompleted.length > 0 && (
            <div className="card space-y-1 p-0">
              <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">Past winners</p>
              <div className="divide-y divide-border">
                {gotmCompleted.map((batch) => {
                  const winners = getGotmWinners(batch.rows);
                  return (
                    <Link
                      key={batch.batchNumber}
                      href={`/league-table/gotm/${batch.batchNumber}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-raised"
                    >
                      <span>
                        <span className="block text-sm font-semibold">
                          GOTM {batch.batchNumber} <span className="font-normal text-muted">— {weekRangeLabel(batch.weekNumbers)}</span>
                        </span>
                        <span className="text-xs text-muted">
                          {winners.length > 1 ? "Winners" : "Winner"}: {winnersLabel(winners)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="pill-amber">{winners[0]?.points ?? 0} pts</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
