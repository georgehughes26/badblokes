/**
 * English football seasons run August -> May, spanning two calendar
 * years, and openfootball names its folders e.g. "2026-27" for the season
 * that starts in August 2026. Before July we're still in the previous
 * season; from July onwards (pre-season transfers etc.) we've rolled into
 * the new one.
 */
export function getCurrentSeasonFolder(now: Date): string {
  const year = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const shortNextYear = String((year + 1) % 100).padStart(2, "0");
  return `${year}-${shortNextYear}`;
}

/** The season folder immediately before this one, e.g. "2026-27" -> "2025-26". */
export function getPreviousSeasonFolder(seasonFolder: string): string {
  const [startYear] = seasonFolder.split("-").map(Number);
  const previousStart = startYear - 1;
  const shortEndYear = String(startYear % 100).padStart(2, "0");
  return `${previousStart}-${shortEndYear}`;
}
