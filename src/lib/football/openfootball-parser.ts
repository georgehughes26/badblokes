/**
 * Parser for openfootball's football.txt format (see
 * https://github.com/openfootball/england). Pure text-in, matches-out — no
 * network calls here, so it's unit-testable against fixed sample text.
 *
 * There are two line styles in the wild for the same format family:
 *
 *   Style A (Championship/League One/League Two/National League, and the
 *   Premier League before results are known):
 *     Sat Aug 9 2025
 *       14:00  Team A          v Team B          2-1 (1-0)
 *              Team C          v Team D          0-0
 *
 *   Style B (Premier League once results are filled in — the score sits
 *   between the team names instead of a literal "v", followed by an
 *   indented goalscorer line we don't care about):
 *     Sat Aug 16
 *       15:00   Team A  1-1 (0-0)  Team B
 *                     (Scorer 55'; Other Scorer 90+7')
 *
 * A match line with no leading time inherits the time of the match line
 * above it (they're both kicking off at the same time, column-aligned).
 * Date lines omit the year once it's already been stated, so we carry the
 * last explicit year forward — the source restates it on the first date
 * after a year boundary (e.g. "Thu Jan 1 2026").
 */

export interface ParsedMatch {
  /** ISO date, e.g. "2025-08-09". */
  date: string;
  /** "HH:mm" in whatever timezone the source data uses (Europe/London, unadjusted for BST/GMT — see provider.ts). */
  time: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
}

const MONTHS: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

const DATE_LINE = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\s+(\d{1,2})(?:\s+(\d{4}))?$/;
const STYLE_A_LINE = /^(?:(\d{1,2}:\d{2})\s+)?(.+?)\s+v\s+(.+?)(?:\s{2,}(\d+)-(\d+)(?:\s*\([^)]*\))?)?$/;
const STYLE_B_LINE =
  /^(?:(\d{1,2}:\d{2})\s+)?(.+?)\s{2,}(\d+)-(\d+)(?:\s*\([^)]*\))?\s{2,}(.+?)\s*$/;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function parseFootballTxt(text: string): ParsedMatch[] {
  const matches: ParsedMatch[] = [];
  let currentDate: string | null = null;
  let currentYear: number | null = null;
  let lastTime: string | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (
      trimmed.startsWith("=") ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("▪") ||
      trimmed.startsWith("(")
    ) {
      // Header, metadata, round marker, or a goalscorer continuation line
      // (Style B) — none of these are matches.
      continue;
    }

    const dateMatch = trimmed.match(DATE_LINE);
    if (dateMatch) {
      const [, monthAbbr, day, yearStr] = dateMatch;
      if (yearStr) currentYear = Number(yearStr);
      const month = MONTHS[monthAbbr];
      if (month && currentYear) {
        currentDate = `${currentYear}-${pad(month)}-${pad(Number(day))}`;
      }
      lastTime = null;
      continue;
    }

    if (!currentDate) continue;

    if (/\sv\s/.test(trimmed)) {
      const m = trimmed.match(STYLE_A_LINE);
      if (!m) continue;
      const [, time, home, away, homeScoreStr, awayScoreStr] = m;
      const effectiveTime = time ?? lastTime;
      if (time) lastTime = time;
      matches.push({
        date: currentDate,
        time: effectiveTime,
        homeTeam: home.trim(),
        awayTeam: away.trim(),
        homeScore: homeScoreStr ? Number(homeScoreStr) : null,
        awayScore: awayScoreStr ? Number(awayScoreStr) : null,
      });
      continue;
    }

    const styleB = trimmed.match(STYLE_B_LINE);
    if (styleB) {
      const [, time, home, homeScoreStr, awayScoreStr, away] = styleB;
      const effectiveTime = time ?? lastTime;
      if (time) lastTime = time;
      matches.push({
        date: currentDate,
        time: effectiveTime,
        homeTeam: home.trim(),
        awayTeam: away.trim(),
        homeScore: Number(homeScoreStr),
        awayScore: Number(awayScoreStr),
      });
    }
    // Anything else (blank continuation, unrecognised) is skipped.
  }

  return matches;
}
