import type { StandingRow } from "@/lib/standings";

const MEDAL_CLASS: Record<number, string> = {
  0: "text-warn",
  1: "text-foreground/80",
  2: "text-[#c07a4a]",
};

export function StandingsTable({ rows, currentUserId }: { rows: StandingRow[]; currentUserId?: string }) {
  if (rows.length === 0) {
    return <p className="card text-center text-sm text-muted">No settled gameweeks yet.</p>;
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="sticky left-0 z-10 w-12 bg-surface px-4 py-3">#</th>
            <th className="sticky left-12 z-10 bg-surface px-2 py-3">Player</th>
            <th className="px-3 py-3 text-right">P</th>
            <th className="px-3 py-3 text-right">W</th>
            <th className="px-3 py-3 text-right">L</th>
            <th className="px-3 py-3 text-right">Pts</th>
            <th className="px-3 py-3 text-right">Fines</th>
            <th className="px-4 py-3 text-right">Joker</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => {
            const isYou = row.userId === currentUserId;
            const rowBg = isYou ? "bg-accent/10" : "bg-surface";
            return (
              <tr key={row.userId} className={isYou ? "bg-accent/10" : undefined}>
                <td className={`sticky left-0 z-10 w-12 px-4 py-3 font-display text-base font-semibold ${rowBg} ${MEDAL_CLASS[i] ?? "text-muted"}`}>
                  {i + 1}
                </td>
                <td className={`sticky left-12 z-10 px-2 py-3 font-medium ${rowBg}`}>
                  {row.name}
                  {isYou && <span className="pill-green ml-2">You</span>}
                </td>
                <td className="px-3 py-3 text-right text-muted">{row.played}</td>
                <td className="px-3 py-3 text-right text-muted">{row.won}</td>
                <td className="px-3 py-3 text-right text-muted">{row.lost}</td>
                <td className="font-display px-3 py-3 text-right text-base font-bold">{row.points}</td>
                <td className="px-3 py-3 text-right text-danger">{row.fines > 0 ? `£${row.fines}` : "—"}</td>
                <td className="px-4 py-3 text-right text-muted">{row.jokersUsed}/2</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
