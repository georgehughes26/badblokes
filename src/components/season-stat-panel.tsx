function winRateClasses(pct: number): { text: string; bg: string } {
  if (pct > 50) return { text: "text-accent", bg: "bg-accent/10" };
  if (pct < 50) return { text: "text-danger", bg: "bg-danger/10" };
  return { text: "text-foreground", bg: "bg-surface-raised" };
}

/** One player's P/W/L/points for a season (or all-time) with the win rate called out as the headline number, colored above/below 50%. */
export function SeasonStatPanel({
  label,
  played,
  won,
  lost,
  points,
}: {
  label: string;
  played: number;
  won: number;
  lost: number;
  points: number;
}) {
  const winPct = played > 0 ? Math.round((won / played) * 100) : 0;
  const { text, bg } = winRateClasses(winPct);

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <div className={`flex items-baseline gap-1.5 rounded-xl px-3 py-1.5 ${bg}`}>
          <span className={`font-display text-2xl font-bold leading-none ${text}`}>{winPct}%</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">win rate</span>
        </div>
      </div>
      <div className="grid grid-cols-4 divide-x divide-border overflow-hidden rounded-xl border border-border">
        <StatCell label="Played" value={played} />
        <StatCell label="Won" value={won} />
        <StatCell label="Lost" value={lost} />
        <StatCell label="Points" value={points} />
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-3 text-center">
      <span className="font-display text-xl font-bold">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}
