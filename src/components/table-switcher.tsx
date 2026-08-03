"use client";

import { useState } from "react";
import type { StandingRow } from "@/lib/standings";
import { StandingsTable } from "@/components/standings-table";

export function TableSwitcher({
  season,
  gotm,
  currentUserId,
}: {
  season: StandingRow[];
  gotm: StandingRow[];
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
      <StandingsTable rows={view === "season" ? season : gotm} currentUserId={currentUserId} />
    </div>
  );
}
