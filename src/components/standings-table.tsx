import type { StandingRow } from "@/lib/standings";

export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  if (rows.length === 0) {
    return <p className="card text-center text-sm text-muted">No settled gameweeks yet.</p>;
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3 text-right">P</th>
            <th className="px-4 py-3 text-right">W</th>
            <th className="px-4 py-3 text-right">L</th>
            <th className="px-4 py-3 text-right">Pts</th>
            <th className="px-4 py-3 text-right">Fines</th>
            <th className="px-4 py-3 text-right">Joker</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => (
            <tr key={row.userId}>
              <td className="px-4 py-3 text-muted">{i + 1}</td>
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3 text-right">{row.played}</td>
              <td className="px-4 py-3 text-right">{row.won}</td>
              <td className="px-4 py-3 text-right">{row.lost}</td>
              <td className="px-4 py-3 text-right font-semibold">{row.points}</td>
              <td className="px-4 py-3 text-right text-danger">{row.fines > 0 ? `£${row.fines}` : "—"}</td>
              <td className="px-4 py-3 text-right text-muted">{row.jokersUsed}/2</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
