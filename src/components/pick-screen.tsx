"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseOdds } from "@/lib/odds";

export interface TeamCardData {
  id: string;
  name: string;
  shortName: string;
  available: boolean;
  reason: string | null;
}

export interface FixtureProp {
  fixtureId: string;
  kickoffAt: string;
  home: TeamCardData;
  away: TeamCardData;
}

interface PickScreenProps {
  gameweekId: string;
  fixtures: FixtureProp[];
  jokerAvailable: boolean;
  jokerHalfLabel: string;
  oddsMinDecimal: number;
}

interface SuccessData {
  teamName: string;
  oddsDecimal: number;
  isJoker: boolean;
  slipToken: string;
}

export function PickScreen({ gameweekId, fixtures, jokerAvailable, jokerHalfLabel, oddsMinDecimal }: PickScreenProps) {
  const router = useRouter();
  const [selectedTeam, setSelectedTeam] = useState<TeamCardData | null>(null);
  const [oddsRaw, setOddsRaw] = useState("");
  const [isJoker, setIsJoker] = useState(false);
  const [jokerAcknowledged, setJokerAcknowledged] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessData | null>(null);

  const parsedOdds = parseOdds(oddsRaw);
  const oddsTooShort = parsedOdds !== null && parsedOdds < oddsMinDecimal;
  const canConfirm = selectedTeam !== null && parsedOdds !== null && (!isJoker || jokerAcknowledged);

  function selectTeam(team: TeamCardData) {
    if (!team.available) return;
    setSelectedTeam(team);
    setOddsRaw("");
    setIsJoker(false);
    setJokerAcknowledged(false);
    setError(null);
  }

  async function submitPick() {
    if (!selectedTeam || parsedOdds === null) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameweekId, teamId: selectedTeam.id, oddsRaw, isJoker }),
    });
    const data = await res.json();
    setSubmitting(false);
    setConfirming(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong — try again");
      if (res.status === 409) {
        // Someone beat us to it (or we already picked) — refresh so
        // availability reflects reality before they try again.
        router.refresh();
      }
      return;
    }
    setSuccess(data);
  }

  if (success) {
    return (
      <div className="card space-y-2">
        <p className="pill-green w-fit">Pick locked in</p>
        <p className="text-lg font-semibold">{success.teamName}</p>
        <p className="text-sm text-muted">Odds: {success.oddsDecimal.toFixed(2)}</p>
        {success.isJoker && <p className="pill-amber w-fit">Joker played</p>}
        <p className="mt-2 text-sm text-muted">
          Now go place that bet for real and keep hold of your slip — bet slip upload is coming right up.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-28">
      {fixtures.map((fixture) => (
        <div key={fixture.fixtureId} className="card">
          <div className="grid grid-cols-2 gap-3">
            <TeamCard
              team={fixture.home}
              selected={selectedTeam?.id === fixture.home.id}
              onSelect={() => selectTeam(fixture.home)}
            />
            <TeamCard
              team={fixture.away}
              selected={selectedTeam?.id === fixture.away.id}
              onSelect={() => selectTeam(fixture.away)}
            />
          </div>

          {selectedTeam && (selectedTeam.id === fixture.home.id || selectedTeam.id === fixture.away.id) && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <div>
                <label className="label" htmlFor="odds">
                  What odds did you get on {selectedTeam.name}?
                </label>
                <input
                  id="odds"
                  className="input"
                  placeholder="e.g. 2/1, evens, or 3.00"
                  value={oddsRaw}
                  onChange={(e) => setOddsRaw(e.target.value)}
                  autoFocus
                />
                {oddsRaw && parsedOdds === null && (
                  <p className="mt-1.5 text-xs text-danger">Couldn&apos;t read those odds — try 2/1, evens, or 3.00</p>
                )}
                {parsedOdds !== null && (
                  <p className="mt-1.5 text-xs text-muted">Decimal odds: {parsedOdds.toFixed(2)}</p>
                )}
                {oddsTooShort && (
                  <p className="mt-1.5 rounded-lg bg-warn/15 px-3 py-2 text-xs font-semibold text-warn">
                    ⚠️ Odds shorter than 1/2 ({oddsMinDecimal.toFixed(2)}) — that&apos;s an automatic £5 fine, win or
                    lose.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border bg-surface-raised p-3">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Play your joker on this pick?</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-accent"
                    checked={isJoker}
                    disabled={!jokerAvailable}
                    onChange={(e) => {
                      setIsJoker(e.target.checked);
                      setJokerAcknowledged(false);
                    }}
                  />
                </label>
                {!jokerAvailable && (
                  <p className="mt-1 text-xs text-muted">
                    No joker left for the {jokerHalfLabel} — it&apos;s already been played.
                  </p>
                )}
                {isJoker && jokerAvailable && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <p className="text-xs text-muted">
                      <span className="font-semibold text-accent">Win (or go 2 up):</span> 2 points instead of 1.
                      <br />
                      <span className="font-semibold text-danger">Lose:</span> 0 points <strong>and a £10 fine.</strong>
                      <br />
                      This is your only joker for the {jokerHalfLabel} — once this gameweek locks, it&apos;s gone
                      either way.
                    </p>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-warn"
                        checked={jokerAcknowledged}
                        onChange={(e) => setJokerAcknowledged(e.target.checked)}
                      />
                      Yes, I understand — play my joker on this pick.
                    </label>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}

              <button type="button" className="btn-primary w-full" disabled={!canConfirm} onClick={() => setConfirming(true)}>
                Review pick
              </button>
            </div>
          )}
        </div>
      ))}

      {confirming && selectedTeam && parsedOdds !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="card w-full max-w-sm space-y-4">
            <h2 className="text-base font-bold">Confirm your pick</h2>
            <p className="text-sm">
              <span className="font-semibold">{selectedTeam.name}</span> at odds{" "}
              <span className="font-semibold">{parsedOdds.toFixed(2)}</span>
              {isJoker && <span className="pill-amber ml-2">Joker</span>}
            </p>
            {oddsTooShort && <p className="text-xs text-warn">Remember: that&apos;s a £5 fine for short odds.</p>}
            <p className="text-xs text-muted">
              Picks are final once submitted — nobody but an admin can change this.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setConfirming(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="button" className="btn-primary flex-1" onClick={submitPick} disabled={submitting}>
                {submitting ? "Locking in…" : "Yes, lock it in"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamCard({ team, selected, onSelect }: { team: TeamCardData; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!team.available}
      className={[
        "rounded-xl border px-3 py-3 text-left transition-colors",
        !team.available
          ? "cursor-not-allowed border-border bg-surface-raised/40 opacity-50"
          : selected
            ? "border-accent bg-accent/10"
            : "border-border bg-surface-raised hover:border-accent/50",
      ].join(" ")}
    >
      <p className="text-sm font-semibold">{team.name}</p>
      {!team.available && team.reason && <p className="mt-1 text-xs text-muted">{team.reason}</p>}
    </button>
  );
}
