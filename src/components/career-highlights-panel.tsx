import type { SVGProps } from "react";
import type { CareerHighlights } from "@/lib/career-highlights";
import { TeamBadge } from "@/components/team-badge";

function FlameIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3c1.5 2.5-1 4-1 6.5a3 3 0 0 0 6 0c1 1.5 1.5 3 1.5 4.5a6.5 6.5 0 0 1-13 0C5.5 10 8 8.5 12 3Z" />
    </svg>
  );
}

function TrendDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3.75 6.75 10.5 13.5l3.75-3.75 6 6" />
      <path d="M20.25 9.75v6h-6" />
    </svg>
  );
}

function CrownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3.75 8.25 8 12l4-6.75L16 12l4.25-3.75-1.5 9.75h-13.5l-1.5-9.75Z" />
      <path d="M6.5 18.75h11" />
    </svg>
  );
}

function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3.75 21.5 20.25H2.5L12 3.75Z" />
      <path d="M12 10.5v3.75M12 17.25v.008" />
    </svg>
  );
}

function TicketIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 9a1.5 1.5 0 0 0 0 3v3.75A1.5 1.5 0 0 0 4.5 17.25h15A1.5 1.5 0 0 0 21 15.75V12a1.5 1.5 0 0 1 0-3V6.75A1.5 1.5 0 0 0 19.5 5.25h-15A1.5 1.5 0 0 0 3 6.75V9Z" />
      <path d="M9.75 5.25v12" strokeDasharray="2.5 2.5" />
    </svg>
  );
}

function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3.75 2.47 5.1 5.53.8-4 3.95.94 5.65L12 16.65l-4.94 2.6.94-5.65-4-3.95 5.53-.8L12 3.75Z" />
    </svg>
  );
}

function HighlightRow({
  icon,
  iconClasses,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  iconClasses: string;
  label: string;
  value: React.ReactNode;
  sublabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="flex min-w-0 items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClasses}`}>{icon}</span>
        <span className="truncate text-sm text-muted">{label}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="font-display block text-base font-bold">{value}</span>
        {sublabel && <span className="block text-xs text-muted">{sublabel}</span>}
      </span>
    </div>
  );
}

/** Career highlights derived from app-tracked seasons only (see lib/career-highlights.ts) — there's no gameweek-level data from before the app existed to compute these from. */
export function CareerHighlightsPanel({ highlights }: { highlights: CareerHighlights }) {
  const { mostSelectedTeam, longestWinStreak, longestLossStreak, gameweeksAtNumberOne, gameweeksInRelegationZone, totalFines, gotmWon } =
    highlights;

  return (
    <div className="card space-y-1 p-0">
      <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">Career Highlights</p>
      <div className="divide-y divide-border">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="flex min-w-0 items-center gap-3">
            {mostSelectedTeam ? (
              <TeamBadge name={mostSelectedTeam.name} shortName={mostSelectedTeam.shortName} crestUrl={mostSelectedTeam.crestUrl} size="sm" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-muted">—</span>
            )}
            <span className="truncate text-sm text-muted">Most Selected Team</span>
          </span>
          <span className="shrink-0 text-right">
            <span className="font-display block text-base font-bold">{mostSelectedTeam?.name ?? "—"}</span>
            {mostSelectedTeam && (
              <span className="block text-xs text-muted">
                {mostSelectedTeam.count} pick{mostSelectedTeam.count === 1 ? "" : "s"}
              </span>
            )}
          </span>
        </div>
        <HighlightRow
          icon={<FlameIcon className="h-5 w-5" />}
          iconClasses="bg-accent/10 text-accent"
          label="Longest Winning Streak"
          value={`${longestWinStreak} GW`}
        />
        <HighlightRow
          icon={<TrendDownIcon className="h-5 w-5" />}
          iconClasses="bg-danger/10 text-danger"
          label="Longest Losing Streak"
          value={`${longestLossStreak} GW`}
        />
        <HighlightRow
          icon={<CrownIcon className="h-5 w-5" />}
          iconClasses="bg-warn/10 text-warn"
          label="GWs at Number 1"
          value={gameweeksAtNumberOne}
        />
        <HighlightRow
          icon={<AlertIcon className="h-5 w-5" />}
          iconClasses="bg-danger/10 text-danger"
          label="GWs in Relegation Zone"
          value={gameweeksInRelegationZone}
        />
        <HighlightRow
          icon={<TicketIcon className="h-5 w-5" />}
          iconClasses="bg-danger/10 text-danger"
          label="Total Fines"
          value={totalFines > 0 ? `£${totalFines}` : "£0"}
        />
        <HighlightRow
          icon={<StarIcon className="h-5 w-5" />}
          iconClasses="bg-accent/10 text-accent"
          label="Gambler of the Month Won"
          value={gotmWon}
        />
      </div>
    </div>
  );
}
