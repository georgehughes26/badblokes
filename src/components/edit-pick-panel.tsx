"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TeamBadge } from "@/components/team-badge";
import type { TeamOption } from "@/lib/picks";

interface EditPickPanelProps {
  pickId: string;
  currentTeamId: string;
  currentTeamName: string;
  currentTeamShortName: string;
  currentTeamCrestUrl: string | null;
  currentIsJoker: boolean;
  teamOptions: TeamOption[];
  jokerAvailable: boolean;
  jokerHalfLabel: string;
  canChangeTeam: boolean;
}

export function EditPickPanel({
  pickId,
  currentTeamId,
  currentTeamName,
  currentTeamShortName,
  currentTeamCrestUrl,
  currentIsJoker,
  teamOptions,
  jokerAvailable,
  jokerHalfLabel,
  canChangeTeam,
}: EditPickPanelProps) {
  const router = useRouter();
  const [isJoker, setIsJoker] = useState(currentIsJoker);
  const [jokerAcknowledged, setJokerAcknowledged] = useState(false);
  const [savingJoker, setSavingJoker] = useState(false);
  const [jokerError, setJokerError] = useState<string | null>(null);

  const [changingTeam, setChangingTeam] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<TeamOption | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  const filteredTeams = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = teamOptions.filter((t) => t.id !== currentTeamId);
    if (!q) return pool.slice(0, 8);
    return pool.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 20);
  }, [query, teamOptions, currentTeamId]);

  async function saveJoker(next: boolean) {
    setSavingJoker(true);
    setJokerError(null);
    const res = await fetch("/api/picks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickId, isJoker: next }),
    });
    const data = await res.json();
    setSavingJoker(false);
    if (!res.ok) {
      setJokerError(data.error ?? "Something went wrong");
      setIsJoker(!next);
      return;
    }
    setIsJoker(next);
    setJokerAcknowledged(false);
    router.refresh();
  }

  function handleJokerToggle(checked: boolean) {
    setJokerError(null);
    if (!checked) {
      saveJoker(false);
      return;
    }
    // Turning on needs the acknowledgment below before it actually saves.
    setIsJoker(true);
  }

  async function confirmTeamChange() {
    if (!selectedTeam) return;
    setSavingTeam(true);
    setTeamError(null);
    const res = await fetch("/api/picks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickId, teamId: selectedTeam.id }),
    });
    const data = await res.json();
    setSavingTeam(false);
    if (!res.ok) {
      setTeamError(data.error ?? "Something went wrong");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <div className="rounded-xl border border-border bg-surface-raised p-3">
        <label
          className={[
            "flex items-center justify-between gap-3",
            jokerAvailable ? "cursor-pointer" : "cursor-not-allowed opacity-60",
          ].join(" ")}
        >
          <span className="text-sm font-medium">Play your joker on this pick?</span>
          <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={isJoker}
              disabled={!jokerAvailable || savingJoker}
              onChange={(e) => handleJokerToggle(e.target.checked)}
            />
            <span className="absolute inset-0 rounded-full bg-border transition-colors peer-checked:bg-warn peer-focus-visible:ring-2 peer-focus-visible:ring-warn" />
            <span className="absolute left-1 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
          </span>
        </label>
        {!jokerAvailable && !currentIsJoker && (
          <p className="mt-1 text-xs text-muted">No joker left for the {jokerHalfLabel} — already played.</p>
        )}
        {isJoker && !currentIsJoker && (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            <p className="text-xs text-muted">
              <span className="font-semibold text-accent">Win (or go 2 up):</span> 2 points instead of 1.
              <br />
              <span className="font-semibold text-danger">Lose:</span> 0 points <strong>and a £10 fine.</strong>
              <br />
              This is your only joker for the {jokerHalfLabel} — it&apos;s gone either way once this locks.
            </p>
            <label className="flex cursor-pointer items-center gap-2 py-1 text-xs">
              <input
                type="checkbox"
                className="h-4 w-4 accent-warn"
                checked={jokerAcknowledged}
                onChange={(e) => setJokerAcknowledged(e.target.checked)}
              />
              Yes, I understand — play my joker on this pick.
            </label>
            <button
              type="button"
              className="btn-primary w-full"
              disabled={!jokerAcknowledged || savingJoker}
              onClick={() => saveJoker(true)}
            >
              {savingJoker ? "Saving…" : "Confirm joker"}
            </button>
          </div>
        )}
        {jokerError && <p className="mt-2 text-xs text-danger">{jokerError}</p>}
      </div>

      {canChangeTeam && (
        <div className="border-t border-border pt-4">
          {!changingTeam ? (
            <button type="button" className="btn-secondary w-full" onClick={() => setChangingTeam(true)}>
              Change team
            </button>
          ) : (
            <div className="space-y-2">
              <label className="label" htmlFor="edit-team-search">
                Search for a different team
              </label>
              <input
                id="edit-team-search"
                className="input"
                placeholder="Start typing…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              <div className="max-h-72 overflow-y-auto rounded-xl border border-border bg-surface-raised">
                {filteredTeams.length === 0 && <p className="px-3 py-3 text-sm text-muted">No teams match that.</p>}
                {filteredTeams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    disabled={!team.available}
                    onClick={() => setSelectedTeam(team)}
                    className={[
                      "flex min-h-14 w-full items-center justify-between gap-2 px-3 py-3 text-left text-sm transition-colors active:bg-surface",
                      team.available ? "cursor-pointer hover:bg-surface" : "cursor-not-allowed opacity-50",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-3">
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
              <button
                type="button"
                className="text-xs font-semibold text-muted hover:text-foreground"
                onClick={() => {
                  setChangingTeam(false);
                  setQuery("");
                  setTeamError(null);
                }}
              >
                Cancel
              </button>
              {teamError && <p className="text-xs text-danger">{teamError}</p>}
            </div>
          )}
        </div>
      )}

      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="pb-safe card w-full max-w-sm space-y-4 rounded-b-none sm:rounded-b-2xl">
            <div className="mx-auto -mt-1 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
            <h2 className="font-display text-xl font-bold">Switch team?</h2>
            <div className="flex items-center gap-3">
              <TeamBadge name={currentTeamName} shortName={currentTeamShortName} crestUrl={currentTeamCrestUrl} />
              <span className="text-muted">→</span>
              <TeamBadge name={selectedTeam.name} shortName={selectedTeam.shortName} crestUrl={selectedTeam.crestUrl} />
            </div>
            <p className="text-sm">
              Swap <span className="font-semibold">{currentTeamName}</span> for{" "}
              <span className="font-semibold">{selectedTeam.name}</span>?
            </p>
            {teamError && <p className="text-xs text-danger">{teamError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setSelectedTeam(null)}
                disabled={savingTeam}
              >
                Cancel
              </button>
              <button type="button" className="btn-primary flex-1" onClick={confirmTeamChange} disabled={savingTeam}>
                {savingTeam ? "Saving…" : "Yes, switch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
