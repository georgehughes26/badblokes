/**
 * The "no back-to-back team" rule: a player can't pick the same team two
 * gameweeks running. Compares only against the immediately preceding
 * gameweek in the same season — it's a one-week cooldown, not a
 * season-long used-teams list. Resets at a season boundary (the caller
 * simply never passes a previous pick from a different season).
 */
export function isTeamOnCooldown(
  previousGameweekTeamId: string | null,
  candidateTeamId: string,
): boolean {
  if (previousGameweekTeamId === null) return false;
  return previousGameweekTeamId === candidateTeamId;
}
