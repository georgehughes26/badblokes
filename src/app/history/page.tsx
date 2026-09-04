import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getGameweekHistory } from "@/lib/history";
import { computeStandings } from "@/lib/standings";
import { getUserAllTimeStats } from "@/lib/all-time";
import { getPlayerCareerHighlights } from "@/lib/career-highlights";
import { getPlayerTrophyCabinet, getChampionSeasons } from "@/lib/trophies";
import { formatLondon } from "@/lib/time";
import { TeamBadge } from "@/components/team-badge";
import { ProfileHeader } from "@/components/profile-header";
import { SeasonStatPanel } from "@/components/season-stat-panel";
import { CareerHighlightsPanel } from "@/components/career-highlights-panel";
import { TrophyCabinet } from "@/components/trophy-cabinet";

function outcomeColor(label: string | null): string {
  if (label === "Won" || label === "Won (EP)") return "text-accent";
  if (label === "Lost" || label === "No pick") return "text-danger";
  return "text-muted";
}

export default async function HistoryPage() {
  const sessionUser = await requireUser();
  const season = await prisma.season.findFirst({ where: { active: true } });

  const [seasons, seasonStandings, allTime, highlights, trophies] = await Promise.all([
    getGameweekHistory(sessionUser.id),
    season ? computeStandings(season.id) : Promise.resolve([]),
    getUserAllTimeStats(sessionUser.id),
    getPlayerCareerHighlights(sessionUser.id),
    getPlayerTrophyCabinet(sessionUser.id),
  ]);
  const myCurrentSeason = seasonStandings.find((r) => r.userId === sessionUser.id);
  const totalGameweeks = seasons.reduce((n, s) => n + s.gameweeks.length, 0);

  return (
    <div className="space-y-6">
      <ProfileHeader name={sessionUser.name} championSeasons={getChampionSeasons(trophies)} />

      <div className="grid gap-4 sm:grid-cols-2">
        {season && myCurrentSeason && (
          <SeasonStatPanel
            label={season.name}
            played={myCurrentSeason.played}
            won={myCurrentSeason.won}
            lost={myCurrentSeason.lost}
            points={myCurrentSeason.points}
          />
        )}
        {allTime && (
          <SeasonStatPanel label="All Time" played={allTime.played} won={allTime.won} lost={allTime.lost} points={allTime.points} />
        )}
      </div>

      <CareerHighlightsPanel highlights={highlights} />

      <TrophyCabinet trophies={trophies} />

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Gameweek History</p>

        {totalGameweeks === 0 && (
          <p className="card text-center text-sm text-muted">
            No gameweeks have kicked off yet — check back after the first round.
          </p>
        )}

        {seasons.map((seasonGroup) => (
          <div key={seasonGroup.seasonId} className="space-y-3">
            {seasons.length > 1 && (
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{seasonGroup.seasonName}</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {seasonGroup.gameweeks.map((gw) => (
                <Link
                  key={gw.id}
                  href={`/history/${gw.id}`}
                  className="card flex flex-col gap-3 transition-colors hover:border-accent/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-lg font-bold">GW{gw.weekNumber}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-muted">{formatLondon(gw.kickoffAt, "d MMM yyyy")}</span>
                      {gw.settled ? <span className="pill-green">Settled</span> : <span className="pill-amber">In play</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                    {gw.myPick ? (
                      <span className="flex min-w-0 items-center gap-2.5">
                        <TeamBadge
                          name={gw.myPick.teamName}
                          shortName={gw.myPick.teamShortName}
                          crestUrl={gw.myPick.teamCrestUrl}
                          size="sm"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{gw.myPick.teamName}</span>
                          <span className="flex items-center gap-1.5 text-xs text-muted">
                            Your pick
                            {gw.myPick.isJoker && <span className="pill-amber">Joker</span>}
                          </span>
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-sm font-bold text-danger">
                          ✕
                        </span>
                        <span className="text-sm text-muted">No pick</span>
                      </span>
                    )}
                    <span className="shrink-0 text-right text-xs">
                      {gw.myOutcomeLabel && <span className={outcomeColor(gw.myOutcomeLabel)}>{gw.myOutcomeLabel}</span>}
                      {gw.myPoints !== null && (
                        <span className="font-display block text-sm font-bold text-foreground">
                          {gw.myPoints > 0 ? `+${gw.myPoints}` : gw.myPoints} pts
                        </span>
                      )}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
