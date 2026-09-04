import type { AllTimeAdjustmentNote, AllTimeRow } from "@/lib/all-time";

const MEDAL_CLASS: Record<number, string> = {
  0: "text-warn",
  1: "text-foreground/80",
  2: "text-[#c07a4a]",
};

/** Career P/W/L/points across every app season and every hand-entered pre-app season — see lib/all-time.ts. No fines or joker columns: those don't carry over from before the app existed. `notes` asterisks a manual adjustment (e.g. a "First To Leave" forfeit) baked into someone's points. */
export function AllTimeTable({
  rows,
  currentUserId,
  notes,
}: {
  rows: AllTimeRow[];
  currentUserId?: string;
  notes?: AllTimeAdjustmentNote[];
}) {
  if (rows.length === 0) {
    return <p className="card text-center text-sm text-muted">No history yet.</p>;
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm sm:min-w-[480px]">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="sticky left-0 z-10 w-10 bg-surface px-3 py-3">#</th>
            <th className="sticky left-10 z-10 bg-surface px-2 py-3">Player</th>
            <th className="px-3 py-3 text-right">P</th>
            <th className="px-3 py-3 text-right">W</th>
            <th className="px-3 py-3 text-right">L</th>
            <th className="px-3 py-3 text-right sm:px-4">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => {
            const isYou = row.userId === currentUserId;
            const isWinner = i === 0;
            const rowBg = isWinner ? "bg-warn/10" : isYou ? "bg-accent/10" : "bg-surface";
            const rankColor = MEDAL_CLASS[i] ?? "text-muted";
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
                    {row.played}P · {row.won}W · {row.lost}L
                  </span>
                </td>
                <td className="px-3 py-3 text-right text-muted">{row.played}</td>
                <td className="px-3 py-3 text-right text-muted">{row.won}</td>
                <td className="px-3 py-3 text-right text-muted">{row.lost}</td>
                <td className="font-display px-3 py-3 text-right text-base font-bold sm:px-4">
                  {row.points}
                  {notes?.some((n) => n.userId === row.userId) && <sup className="text-muted">*</sup>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {notes && notes.length > 0 && (
        <div className="space-y-0.5 border-t border-border px-4 py-3 text-xs text-muted">
          {notes.map((note) => {
            const row = rows.find((r) => r.userId === note.userId);
            return (
              <p key={note.userId}>
                * {row?.name ?? "?"}: {note.points > 0 ? `+${note.points}` : note.points} — {note.reason}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
