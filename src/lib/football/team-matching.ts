/**
 * openfootball spells team names slightly differently than however they
 * were first added to our Team table (e.g. "Chelsea FC" vs "Chelsea",
 * "AFC Bournemouth" vs "Bournemouth"). Normalise before comparing so we
 * match existing teams instead of creating near-duplicates.
 */
export function normalizeTeamName(name: string): string {
  return name
    .replace(/\s+(FC|AFC)$/i, "")
    .replace(/^AFC\s+/i, "")
    .trim()
    .toLowerCase();
}
