/**
 * Joker allocation: each player gets one joker for the first half of the
 * season and one for the second half, split by the season's
 * `jokerSplitDate` (a Christmas-Day-style boundary set per season). A
 * joker used in one half can't be borrowed from the other.
 */

export type JokerHalf = "H1" | "H2";

export interface JokerConfig {
  /** How many jokers a player gets per half. Defaults to 1. */
  jokersPerHalf: number;
}

export const DEFAULT_JOKER_CONFIG: JokerConfig = { jokersPerHalf: 1 };

/** Which half of the season does a gameweek with this deadline fall into? */
export function getJokerHalf(gameweekDeadline: Date, jokerSplitDate: Date): JokerHalf {
  return gameweekDeadline.getTime() < jokerSplitDate.getTime() ? "H1" : "H2";
}

/**
 * Has the player already used up their joker(s) for this half of the
 * season? `previousJokerHalves` is every half in which they've already
 * played a joker this season (locked gameweeks only).
 */
export function canPlayJoker(
  previousJokerHalves: JokerHalf[],
  targetHalf: JokerHalf,
  config: JokerConfig = DEFAULT_JOKER_CONFIG,
): boolean {
  const usedInHalf = previousJokerHalves.filter((h) => h === targetHalf).length;
  return usedInHalf < config.jokersPerHalf;
}

export interface JokerAvailability {
  half: JokerHalf;
  used: number;
  remaining: number;
  available: boolean;
}

/** Full picture of a player's joker state for a given gameweek — what the UI shows on the pick screen. */
export function getJokerAvailability(
  gameweekDeadline: Date,
  jokerSplitDate: Date,
  previousJokerHalves: JokerHalf[],
  config: JokerConfig = DEFAULT_JOKER_CONFIG,
): JokerAvailability {
  const half = getJokerHalf(gameweekDeadline, jokerSplitDate);
  const used = previousJokerHalves.filter((h) => h === half).length;
  const remaining = Math.max(0, config.jokersPerHalf - used);
  return { half, used, remaining, available: remaining > 0 };
}
