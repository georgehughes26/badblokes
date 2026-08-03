"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { settlePlayerGameweek, type PlayerGameweekInput, type SettlementOutcome } from "@/lib/rules";

export interface ResultsEntryPick {
  pickId: string;
  userId: string;
  userName: string;
  teamName: string;
  isJoker: boolean;
  slipSubmitted: boolean;
  slipUrl: string | null;
  won: boolean;
  wentTwoUp: boolean;
  shortOdds: boolean;
}

export interface NoPickPlayer {
  userId: string;
  userName: string;
}

interface PickFactState {
  won: boolean;
  wentTwoUp: boolean;
  slipSubmitted: boolean;
  shortOdds: boolean;
}

function toInput(fact: PickFactState, isJoker: boolean): PlayerGameweekInput {
  return {
    hasPick: true,
    isJoker,
    shortOdds: fact.shortOdds,
    slipSubmitted: fact.slipSubmitted,
    won: fact.won || fact.wentTwoUp,
  };
}

const NO_PICK_INPUT: PlayerGameweekInput = {
  hasPick: false,
  isJoker: false,
  shortOdds: false,
  slipSubmitted: false,
  won: false,
};

export function ResultsEntryForm({
  gameweekId,
  picks,
  noPickPlayers,
  alreadySettled,
}: {
  gameweekId: string;
  picks: ResultsEntryPick[];
  noPickPlayers: NoPickPlayer[];
  alreadySettled: boolean;
}) {
  const router = useRouter();
  const [facts, setFacts] = useState<Record<string, PickFactState>>(() =>
    Object.fromEntries(
      picks.map((p) => [
        p.pickId,
        { won: p.won, wentTwoUp: p.wentTwoUp, slipSubmitted: p.slipSubmitted, shortOdds: p.shortOdds },
      ]),
    ),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateFact(pickId: string, patch: Partial<PickFactState>) {
    setFacts((prev) => ({ ...prev, [pickId]: { ...prev[pickId], ...patch } }));
  }

  const outcomes = useMemo(() => {
    const result: Array<{ userId: string; userName: string; teamName: string | null; outcome: SettlementOutcome }> = [];
    for (const pick of picks) {
      const fact = facts[pick.pickId];
      const outcome = settlePlayerGameweek(toInput(fact, pick.isJoker));
      result.push({ userId: pick.userId, userName: pick.userName, teamName: pick.teamName, outcome });
    }
    for (const player of noPickPlayers) {
      result.push({ userId: player.userId, userName: player.userName, teamName: null, outcome: settlePlayerGameweek(NO_PICK_INPUT) });
    }
    return result.sort((a, b) => b.outcome.points - a.outcome.points);
  }, [facts, picks, noPickPlayers]);

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameweekId,
        picks: picks.map((p) => ({ pickId: p.pickId, ...facts[p.pickId] })),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-3 p-0">
        <div className="divide-y divide-border">
          {picks.map((pick) => {
            const fact = facts[pick.pickId];
            return (
              <div key={pick.pickId} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center">
                <div>
                  <p className="text-sm font-semibold">
                    {pick.userName} → {pick.teamName} {pick.isJoker && <span className="pill-amber ml-1">Joker</span>}
                  </p>
                  {pick.slipUrl && (
                    <a
                      href={pick.slipUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      View slip ↗
                    </a>
                  )}
                </div>
                <label className="flex cursor-pointer items-center gap-1.5 py-1 text-xs">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-accent"
                    checked={fact.won}
                    onChange={(e) => updateFact(pick.pickId, { won: e.target.checked })}
                  />
                  Won
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 py-1 text-xs">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-accent"
                    checked={fact.wentTwoUp}
                    onChange={(e) => updateFact(pick.pickId, { wentTwoUp: e.target.checked })}
                  />
                  Went 2 up (EP)
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 py-1 text-xs">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-accent"
                    checked={fact.slipSubmitted}
                    onChange={(e) => updateFact(pick.pickId, { slipSubmitted: e.target.checked })}
                  />
                  Slip in
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 py-1 text-xs" title="Odds shorter than 1/2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-warn"
                    checked={fact.shortOdds}
                    onChange={(e) => updateFact(pick.pickId, { shortOdds: e.target.checked })}
                  />
                  Short odds
                </label>
              </div>
            );
          })}
          {picks.length === 0 && <p className="px-4 py-6 text-sm text-muted">No picks were made this gameweek.</p>}
        </div>
      </div>

      {noPickPlayers.length > 0 && (
        <div className="card">
          <p className="text-sm font-semibold text-muted">
            No pick: {noPickPlayers.map((p) => p.userName).join(", ")} — automatic −1 and £10 each.
          </p>
        </div>
      )}

      <div className="card space-y-2 p-0">
        <h2 className="px-4 pt-4 text-sm font-semibold text-muted">Preview</h2>
        <div className="divide-y divide-border">
          {outcomes.map((row) => (
            <div key={row.userId} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span>
                {row.userName} {row.teamName && <span className="text-muted">— {row.teamName}</span>}
              </span>
              <span className="flex items-center gap-2">
                <span className={row.outcome.points > 0 ? "text-accent" : row.outcome.points < 0 ? "text-danger" : "text-muted"}>
                  {row.outcome.points > 0 ? `+${row.outcome.points}` : row.outcome.points} pts
                </span>
                {row.outcome.fine.amount > 0 && <span className="pill-red">£{row.outcome.fine.amount}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-accent">Saved — table and fines updated.</p>}

      <button type="button" className="btn-primary w-full" onClick={handleSave} disabled={submitting}>
        {submitting ? "Saving…" : alreadySettled ? "Re-save settlement" : "Save & settle this gameweek"}
      </button>
    </div>
  );
}
