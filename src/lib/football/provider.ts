import { DateTime } from "luxon";
import { LONDON_ZONE, londonWallTimeToUtc } from "@/lib/time";
import { DIVISIONS, type DivisionLabel } from "@/lib/football/divisions";
import { parseFootballTxt } from "@/lib/football/openfootball-parser";
import { getCurrentSeasonFolder, getPreviousSeasonFolder } from "@/lib/football/season-folder";

export interface FootballTeam {
  name: string;
  division: DivisionLabel;
}

export interface FootballFixture {
  division: DivisionLabel;
  homeTeam: string;
  awayTeam: string;
  /** UTC. Null if the source didn't give a kick-off time. */
  kickoffAt: Date | null;
  homeScore: number | null;
  awayScore: number | null;
}

/**
 * Adapter interface for fixture/result ingestion. The admin UI's manual
 * entry forms talk to Prisma directly and don't go through this — this
 * interface exists for the *optional* automated path. ManualProvider is
 * the trivial no-op default; OpenFootballProvider is the real one.
 */
export interface FootballDataProvider {
  listTeams(): Promise<FootballTeam[]>;
  /** All fixtures kicking off on this Europe/London calendar date, across every covered division. */
  listFixturesOnDate(date: Date): Promise<FootballFixture[]>;
}

export class ManualProvider implements FootballDataProvider {
  async listTeams(): Promise<FootballTeam[]> {
    return [];
  }
  async listFixturesOnDate(): Promise<FootballFixture[]> {
    return [];
  }
}

/**
 * Pulls team lists and fixtures/results from openfootball's free, public
 * domain dataset (https://github.com/openfootball/england) — covers
 * Premier League through League Two. Nothing here ever supplies the "went
 * 2 up" (EP) flag; that stays a manual admin call regardless of source,
 * since no free feed tracks it.
 */
export class OpenFootballProvider implements FootballDataProvider {
  private season: string;

  constructor(season = getCurrentSeasonFolder(new Date())) {
    this.season = season;
  }

  /** Returns null (rather than throwing) when the file doesn't exist yet — some divisions' fixture lists for a new season aren't published as early as others. */
  private async fetchDivisionText(season: string, file: string): Promise<string | null> {
    const url = `https://raw.githubusercontent.com/openfootball/england/master/${season}/${file}`;
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`openfootball: failed to fetch ${file} for season ${season} (${res.status})`);
    }
    return res.text();
  }

  async listTeams(): Promise<FootballTeam[]> {
    const teams: FootballTeam[] = [];
    const seen = new Set<string>();
    const previousSeason = getPreviousSeasonFolder(this.season);

    for (const division of DIVISIONS) {
      // A division's current-season fixture list (and so its team list)
      // might not be published yet — fall back to last season's roster as
      // a reasonable proxy rather than skipping the division entirely.
      const text =
        (await this.fetchDivisionText(this.season, division.file)) ??
        (await this.fetchDivisionText(previousSeason, division.file));
      if (!text) continue;

      for (const match of parseFootballTxt(text)) {
        for (const name of [match.homeTeam, match.awayTeam]) {
          const key = `${division.label}:${name}`;
          if (seen.has(key)) continue;
          seen.add(key);
          teams.push({ name, division: division.label });
        }
      }
    }

    return teams;
  }

  async listFixturesOnDate(date: Date): Promise<FootballFixture[]> {
    const isoDate = DateTime.fromJSDate(date).setZone(LONDON_ZONE).toFormat("yyyy-MM-dd");
    const fixtures: FootballFixture[] = [];

    for (const division of DIVISIONS) {
      // Unlike listTeams, we don't fall back to last season here — a
      // division with no current-season file simply has no fixtures yet,
      // and last season's dates would be actively wrong.
      const text = await this.fetchDivisionText(this.season, division.file);
      if (!text) continue;

      const matches = parseFootballTxt(text).filter((m) => m.date === isoDate);

      for (const match of matches) {
        let kickoffAt: Date | null = null;
        if (match.time) {
          const [year, month, day] = match.date.split("-").map(Number);
          const [hour, minute] = match.time.split(":").map(Number);
          kickoffAt = londonWallTimeToUtc(year, month, day, hour, minute);
        }
        fixtures.push({
          division: division.label,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          kickoffAt,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
        });
      }
    }

    return fixtures;
  }
}
