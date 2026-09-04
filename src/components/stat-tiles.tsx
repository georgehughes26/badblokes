/** Played / Won / Lost / Points / Win % tiles — used for both the current-season and all-time halves of a player's profile. */
export function StatTiles({ played, won, lost, points }: { played: number; won: number; lost: number; points: number }) {
  const winPct = played > 0 ? Math.round((won / played) * 100) : 0;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
      <StatTile label="Played" value={played} />
      <StatTile label="Won" value={won} />
      <StatTile label="Lost" value={lost} />
      <StatTile label="Points" value={points} />
      <StatTile label="Win %" value={`${winPct}%`} accent />
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="card-flat flex flex-col items-center gap-1 py-4 text-center">
      <span className={`font-display text-2xl font-bold ${accent ? "text-accent" : "text-foreground"}`}>{value}</span>
      <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}
