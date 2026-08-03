"use client";

import { useState } from "react";
import type { StandingRow } from "@/lib/standings";
import { StandingsTable } from "@/components/standings-table";

export function TableSwitcher({ season, gotm }: { season: StandingRow[]; gotm: StandingRow[] }) {
  const [view, setView] = useState<"season" | "gotm">("season");

  return (
    <div className="space-y-4">
      <div className="flex w-fit rounded-xl border border-border bg-surface p-1">
        <button
          type="button"
          onClick={() => setView("season")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            view === "season" ? "bg-accent text-black" : "text-muted"
          }`}
        >
          League Table
        </button>
        <button
          type="button"
          onClick={() => setView("gotm")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            view === "gotm" ? "bg-accent text-black" : "text-muted"
          }`}
        >
          Gambler of the Month
        </button>
      </div>
      <StandingsTable rows={view === "season" ? season : gotm} />
    </div>
  );
}
