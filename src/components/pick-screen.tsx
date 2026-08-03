"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseOdds } from "@/lib/odds";
import { TeamBadge } from "@/components/team-badge";
import type { TeamOption } from "@/lib/picks";

interface PickScreenProps {
  gameweekId: string;
  teamOptions: TeamOption[];
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

export function PickScreen({ gameweekId, teamOptions, jokerAvailable, jokerHalfLabel, oddsMinDecimal }: PickScreenProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<TeamOption | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [oddsRaw, setOddsRaw] = useState("");
  const [isJoker, setIsJoker] = useState(false);
  const [jokerAcknowledged, setJokerAcknowledged] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredTeams = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teamOptions.slice(0, 8);
    return teamOptions.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 20);
  }, [query, teamOptions]);

  const parsedOdds = parseOdds(oddsRaw);
  const oddsTooShort = parsedOdds !== null && parsedOdds < oddsMinDecimal;
  const canConfirm = selectedTeam !== null && parsedOdds !== null && (!isJoker || jokerAcknowledged);

  function selectTeam(team: TeamOption) {
    if (!team.available) return;
    setSelectedTeam(team);
    setQuery(team.name);
    setShowResults(false);
    setOddsRaw("");
    setIsJoker(false);
    setJokerAcknowledged(false);
    setError(null);
  }

  function clearSelection() {
    setSelectedTeam(null);
    setQuery("");
    setOddsRaw("");
    setIsJoker(false);
    inputRef.current?.focus();
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
      if (res.status === 409) router.refresh();
      return;
    }
    setSuccess(data);
  }

  if (success) {
    const team = selectedTeam;
    return (
      <div className="card flex flex-col items-center gap-3 py-8 text-center">
        <p className="pill-green">Pick locked in</p>
        {team && <TeamBadge name={team.name} shortName={team.shortName} crestUrl={team.crestUrl} size="lg" />}
        <p className="text-xl font-bold">{success.teamName}</p>
        <p className="text-sm text-muted">Odds: {success.oddsDecimal.toFixed(2)}</p>
        {success.isJoker && <p className="pill-amber">Joker played</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-1">
        <label className="label" htmlFor="team-search">
          Search for your team
        </label>
        <div className="relative">
          <input
            id="team-search"
            ref={inputRef}
            className="input"
            placeholder="Start typing… Arsenal, Wrexham, York City…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedTeam(null);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            autoComplete="off"
          />
          {selectedTeam && (
            <button
              type="button"
              onClick={clearSelection}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-foreground"
            >
              Change
            </button>
          )}
          {showResults && !selectedTeam && (
            <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-surface-raised shadow-lg">
              {filteredTeams.length === 0 && <p className="px-3 py-3 text-sm text-muted">No teams match that.</p>}
              {filteredTeams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  disabled={!team.available}
                  onClick={() => selectTeam(team)}
                  className={[
                    "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                    team.available ? "hover:bg-surface" : "cursor-not-allowed opacity-50",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-2">
                    <TeamBadge name={team.name} shortName={team.shortName} crestUrl={team.crestUrl} size="sm" />
                    <span>
                      <span className="block font-medium">{team.name}</span>
                      {team.division && <span className="block text-xs text-muted">{team.division}</span>}
                    </span>
                  </span>
                  {!team.available && <span className="text-xs text-danger">{team.reason}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedTeam && (
        <div className="card space-y-3">
          <div className="flex items-center gap-3">
            <TeamBadge name={selectedTeam.name} shortName={selectedTeam.shortName} crestUrl={selectedTeam.crestUrl} />
            <p className="text-base font-semibold">{selectedTeam.name}</p>
          </div>

          <div>
            <label className="label" htmlFor="odds">
              What odds did you get?
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
            {parsedOdds !== null && <p className="mt-1.5 text-xs text-muted">Decimal odds: {parsedOdds.toFixed(2)}</p>}
            {oddsTooShort && (
              <p className="mt-1.5 rounded-lg bg-warn/15 px-3 py-2 text-xs font-semibold text-warn">
                ⚠️ Odds shorter than 1/2 ({oddsMinDecimal.toFixed(2)}) — that&apos;s an automatic £5 fine, win or lose.
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
              <p className="mt-1 text-xs text-muted">No joker left for the {jokerHalfLabel} — already played.</p>
            )}
            {isJoker && jokerAvailable && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                <p className="text-xs text-muted">
                  <span className="font-semibold text-accent">Win (or go 2 up):</span> 2 points instead of 1.
                  <br />
                  <span className="font-semibold text-danger">Lose:</span> 0 points <strong>and a £10 fine.</strong>
                  <br />
                  This is your only joker for the {jokerHalfLabel} — it&apos;s gone either way once this locks.
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

      {confirming && selectedTeam && parsedOdds !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="card w-full max-w-sm space-y-4">
            <h2 className="text-base font-bold">Confirm your pick</h2>
            <div className="flex items-center gap-3">
              <TeamBadge name={selectedTeam.name} shortName={selectedTeam.shortName} crestUrl={selectedTeam.crestUrl} />
              <p className="text-sm">
                <span className="font-semibold">{selectedTeam.name}</span> at odds{" "}
                <span className="font-semibold">{parsedOdds.toFixed(2)}</span>
                {isJoker && <span className="pill-amber ml-2">Joker</span>}
              </p>
            </div>
            {oddsTooShort && <p className="text-xs text-warn">Remember: that&apos;s a £5 fine for short odds.</p>}
            <p className="text-xs text-muted">Picks are final once submitted — nobody but an admin can change this.</p>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setConfirming(false)} disabled={submitting}>
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
