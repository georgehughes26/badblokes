import type { StandingRow } from "@/lib/standings";

const MEDAL_CLASS: Record<number, string> = {
  0: "text-warn",
  1: "text-foreground/80",
  2: "text-[#c07a4a]",
};

export interface StandingsNote {
  userId: string;
  points: number;
  reason: string;
}

/** `notes` lists any manual PointsAdjustment (e.g. a "First To Leave" forfeit) under a "Deductions" heading below the table — already folded into the points shown, just not obvious from the picks themselves. Only pass this for a full-season table; a GOTM batch never carries adjustments. */
export function StandingsTable({
  rows,
  currentUserId,
  notes,
}: {
  rows: StandingRow[];
  currentUserId?: string;
  notes?: StandingsNote[];
}) {
  if (rows.length === 0) {
    return <p className="card text-center text-sm text-muted">No settled gameweeks yet.</p>;
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm sm:min-w-[560px]">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="sticky left-0 z-10 w-10 bg-surface px-3 py-3">#</th>
            <th className="sticky left-10 z-10 bg-surface px-2 py-3">Player</th>
            <th className="hidden px-3 py-3 text-right sm:table-cell">P</th>
            <th className="hidden px-3 py-3 text-right sm:table-cell">W</th>
            <th className="hidden px-3 py-3 text-right sm:table-cell">L</th>
            <th className="px-3 py-3 text-right">Pts</th>
            <th className="px-3 py-3 text-right sm:px-4">Fines</th>
            <th className="hidden px-4 py-3 text-right sm:table-cell">Joker</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => {
            const isYou = row.userId === currentUserId;
            // Bottom-2 only kicks in once winner and relegation zone can't
            // collide (a 1- or 2-player table would otherwise highlight the
            // same row as both champion and last place).
            const isBottom = rows.length > 2 && i >= rows.length - 2;
            const isWinner = i === 0;
            const rowBg = isBottom ? "bg-danger/10" : isWinner ? "bg-warn/10" : isYou ? "bg-accent/10" : "bg-surface";
            const rankColor = isBottom ? "text-danger" : (MEDAL_CLASS[i] ?? "text-muted");
            return (
              <tr key={row.userId} className={rowBg}>
                <td className={`sticky left-0 z-10 w-10 px-3 py-3 font-display text-base font-semibold ${rowBg} ${rankColor}`}>
                  {i + 1}
                </td>
                <td className={`sticky left-10 z-10 px-2 py-3 font-medium ${rowBg}`}>
                  <span className="flex flex-wrap items-center gap-x-2">
                    {row.name}
                    {isYou && <span className="pill-green">You</span>}
                  </span>
                  <span className="block text-xs text-muted sm:hidden">
                    {row.played}P · {row.won}W · {row.lost}L · Joker {row.jokersUsed}/2
                  </span>
                </td>
                <td className="hidden px-3 py-3 text-right text-muted sm:table-cell">{row.played}</td>
                <td className="hidden px-3 py-3 text-right text-muted sm:table-cell">{row.won}</td>
                <td className="hidden px-3 py-3 text-right text-muted sm:table-cell">{row.lost}</td>
                <td className="font-display px-3 py-3 text-right text-base font-bold">{row.points}</td>
                <td className="px-3 py-3 text-right text-danger sm:px-4">{row.fines > 0 ? `£${row.fines}` : "—"}</td>
                <td className="hidden px-4 py-3 text-right text-muted sm:table-cell">{row.jokersUsed}/2</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {notes && notes.length > 0 && (
        <div className="space-y-1 border-t border-border px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Deductions</p>
          {notes.map((note) => {
            const row = rows.find((r) => r.userId === note.userId);
            return (
              <p key={note.userId} className="text-xs text-muted">
                {row?.name ?? "?"}: {note.points > 0 ? `+${note.points}` : note.points} — {note.reason}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
