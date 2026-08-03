/**
 * Bad Blokes Acca — scoring & fines engine.
 *
 * Pure, dependency-free. Every rule in the spec lives here as data, not as
 * logic scattered through the app. Nothing in this file touches the
 * database, the clock, or React — it only transforms plain inputs into
 * points/breaches/fines so it can be reasoned about (and tested) in
 * isolation.
 *
 * The one rule that matters most: fines never stack. A player pays exactly
 * ONE fine per gameweek — the first match in FINE_PRECEDENCE below.
 */

export interface RulesConfig {
  /** Decimal odds below this are "too short" (breach C). 1/2 = 1.50 is legal. */
  oddsMinDecimal: number;
  /** Breach A — no pick by the pick deadline. */
  fineNoPick: number;
  /** Breach B — no bet slip by the slip deadline. */
  fineNoSlip: number;
  /** Breach C — picked team's odds shorter than oddsMinDecimal. */
  fineShortOdds: number;
  /** Breach D — picked team didn't win (and didn't go 2 up). */
  fineTeamLost: number;
  /** Breach E — joker played and lost. */
  fineJokerLost: number;
  /** Two or three major breaches (A/B/C) in one gameweek. */
  fineMultiBreach: number;
  /** Points for a normal win (or EP). */
  pointsWin: number;
  /** Points for a joker win (or EP). */
  pointsJokerWin: number;
  /** Points when two or three major breaches occur — overrides everything else. */
  pointsMultiBreachPenalty: number;
}

export const DEFAULT_RULES_CONFIG: RulesConfig = {
  oddsMinDecimal: 1.5,
  fineNoPick: 5,
  fineNoSlip: 5,
  fineShortOdds: 5,
  fineTeamLost: 2,
  fineJokerLost: 10,
  fineMultiBreach: 10,
  pointsWin: 1,
  pointsJokerWin: 2,
  pointsMultiBreachPenalty: -1,
};

/** One player's raw state for a single gameweek, already resolved against the fixture. */
export interface PlayerGameweekInput {
  /** Did the player make a pick before the pick deadline (or was one force-set by an admin)? */
  hasPick: boolean;
  /** Was this pick the player's joker? Must be false when hasPick is false. */
  isJoker: boolean;
  /** Normalised decimal odds as entered for the pick. Null when hasPick is false. */
  oddsDecimal: number | null;
  /** Was a bet slip submitted before the slip deadline? Always false when hasPick is false. */
  slipSubmitted: boolean;
  /**
   * Did the picked team win outright, OR go 2 goals ahead at any point (EP)?
   * These are the same outcome everywhere in the app — combine them before
   * calling in (see `didTeamWin`). Always false when hasPick is false.
   */
  won: boolean;
}

export interface BreachFlags {
  /** A — no pick by the pick deadline. */
  noPick: boolean;
  /** B — no bet slip by the slip deadline. */
  noSlip: boolean;
  /** C — picked team's odds shorter than the legal minimum. */
  shortOdds: boolean;
  /** D — picked team didn't win (and didn't go 2 up). Purely factual; may be superseded by E for fine purposes. */
  teamLost: boolean;
  /** E — joker played and lost. */
  jokerLost: boolean;
}

export type FineRuleId =
  | "MULTI_BREACH"
  | "JOKER_LOST"
  | "NO_PICK"
  | "NO_SLIP"
  | "SHORT_ODDS"
  | "TEAM_LOST"
  | "NO_FINE";

export interface FineOutcome {
  ruleId: FineRuleId;
  amount: number;
  reason: string;
}

export interface SettlementOutcome {
  points: number;
  breaches: BreachFlags;
  fine: FineOutcome;
  jokerPlayed: boolean;
}

/** Fixture scoreline plus the admin-entered "went 2 up" flags for both sides. */
export interface FixtureResultInput {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  wentTwoAheadHome: boolean;
  wentTwoAheadAway: boolean;
}

/**
 * Did `teamId` win this fixture outright, or go 2 goals ahead at any point?
 * Treated identically everywhere downstream — an EP counts as a win, full
 * stop, even if the team went on to draw or lose.
 */
export function didTeamWin(fixture: FixtureResultInput, teamId: string): boolean {
  if (teamId === fixture.homeTeamId) {
    return fixture.homeScore > fixture.awayScore || fixture.wentTwoAheadHome;
  }
  if (teamId === fixture.awayTeamId) {
    return fixture.awayScore > fixture.homeScore || fixture.wentTwoAheadAway;
  }
  throw new Error(`Team ${teamId} is not in this fixture`);
}

function computeBreaches(input: PlayerGameweekInput, config: RulesConfig): BreachFlags {
  const noPick = !input.hasPick;
  const noSlip = !input.slipSubmitted;
  const shortOdds =
    input.hasPick && input.oddsDecimal !== null && input.oddsDecimal < config.oddsMinDecimal;
  const teamLost = input.hasPick && !input.won;
  const jokerLost = input.hasPick && input.isJoker && !input.won;

  return { noPick, noSlip, shortOdds, teamLost, jokerLost };
}

function majorBreachCount(breaches: BreachFlags): number {
  return [breaches.noPick, breaches.noSlip, breaches.shortOdds].filter(Boolean).length;
}

/**
 * The single ordered list of fine rules. Read top to bottom — the first rule
 * whose `test` passes is the ONE fine the player pays for the gameweek.
 * Keep this list, in this order, as the one place fine precedence is
 * decided — do not re-derive precedence anywhere else with nested ifs.
 */
const FINE_PRECEDENCE: Array<{
  id: FineRuleId;
  test: (breaches: BreachFlags, majorCount: number) => boolean;
  amount: (config: RulesConfig) => number;
  reason: (config: RulesConfig) => string;
}> = [
  {
    id: "MULTI_BREACH",
    test: (_breaches, majorCount) => majorCount >= 2,
    amount: (c) => c.fineMultiBreach,
    reason: (c) => `£${c.fineMultiBreach} — two or more major breaches`,
  },
  {
    id: "JOKER_LOST",
    test: (breaches) => breaches.jokerLost,
    amount: (c) => c.fineJokerLost,
    reason: (c) => `£${c.fineJokerLost} — joker played and lost`,
  },
  {
    id: "NO_PICK",
    test: (breaches, majorCount) => majorCount === 1 && breaches.noPick,
    amount: (c) => c.fineNoPick,
    reason: (c) => `£${c.fineNoPick} — no pick`,
  },
  {
    id: "NO_SLIP",
    test: (breaches, majorCount) => majorCount === 1 && breaches.noSlip,
    amount: (c) => c.fineNoSlip,
    reason: (c) => `£${c.fineNoSlip} — no bet slip`,
  },
  {
    id: "SHORT_ODDS",
    test: (breaches, majorCount) => majorCount === 1 && breaches.shortOdds,
    amount: (c) => c.fineShortOdds,
    reason: (c) => `£${c.fineShortOdds} — odds too short`,
  },
  {
    id: "TEAM_LOST",
    test: (breaches) => breaches.teamLost,
    amount: (c) => c.fineTeamLost,
    reason: (c) => `£${c.fineTeamLost} — team didn't win`,
  },
  {
    id: "NO_FINE",
    test: () => true,
    amount: () => 0,
    reason: () => "No fine",
  },
];

function computeFine(breaches: BreachFlags, config: RulesConfig): FineOutcome {
  const majorCount = majorBreachCount(breaches);
  const rule = FINE_PRECEDENCE.find((r) => r.test(breaches, majorCount));
  // FINE_PRECEDENCE always ends in a catch-all, so this is never undefined.
  const matched = rule!;
  return {
    ruleId: matched.id,
    amount: matched.amount(config),
    reason: matched.reason(config),
  };
}

function computePoints(
  breaches: BreachFlags,
  input: PlayerGameweekInput,
  config: RulesConfig,
): number {
  if (majorBreachCount(breaches) >= 2) {
    // A joker never doubles this penalty — it just stays at the flat amount.
    return config.pointsMultiBreachPenalty;
  }
  if (input.won) {
    return input.isJoker ? config.pointsJokerWin : config.pointsWin;
  }
  return 0;
}

/** Settle a single player's gameweek: points, breach flags, and the one fine that applies. */
export function settlePlayerGameweek(
  input: PlayerGameweekInput,
  config: RulesConfig = DEFAULT_RULES_CONFIG,
): SettlementOutcome {
  if (!input.hasPick && input.isJoker) {
    throw new Error("Cannot play a joker on a no-pick week");
  }
  if (!input.hasPick && (input.won || input.slipSubmitted || input.oddsDecimal !== null)) {
    throw new Error("A no-pick input cannot have a result, a slip, or odds");
  }

  const breaches = computeBreaches(input, config);
  const fine = computeFine(breaches, config);
  const points = computePoints(breaches, input, config);

  return { points, breaches, fine, jokerPlayed: input.hasPick && input.isJoker };
}

/** Settle every player's gameweek in one pass. Order of the input map is preserved in the output. */
export function settleGameweek(
  players: Record<string, PlayerGameweekInput>,
  config: RulesConfig = DEFAULT_RULES_CONFIG,
): Record<string, SettlementOutcome> {
  const result: Record<string, SettlementOutcome> = {};
  for (const [userId, input] of Object.entries(players)) {
    result[userId] = settlePlayerGameweek(input, config);
  }
  return result;
}
