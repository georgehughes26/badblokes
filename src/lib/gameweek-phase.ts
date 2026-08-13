import type { GameweekStatus } from "@prisma/client";

export interface GameweekPhaseInput {
  status: GameweekStatus;
  picksOpenAt: Date;
  pickDeadlineAt: Date;
}

/**
 * The gameweek's real, live phase — derived from the clock, not a manual
 * admin toggle. UPCOMING -> OPEN -> LOCKED happen automatically as the pick
 * window opens and closes, so nobody needs to remember to "open" a
 * gameweek. SETTLED and a manual LOCKED override are the only two states an
 * admin ever sets directly: SETTLED once results are in (via the results
 * flow), LOCKED as an emergency early cutoff (e.g. a postponement) that
 * sticks until explicitly reverted.
 */
export function deriveGameweekPhase(gw: GameweekPhaseInput, now: Date): GameweekStatus {
  if (gw.status === "SETTLED") return "SETTLED";
  if (gw.status === "LOCKED") return "LOCKED";
  if (now < gw.picksOpenAt) return "UPCOMING";
  if (now < gw.pickDeadlineAt) return "OPEN";
  return "LOCKED";
}

/** Convenience wrapper for the common case of "what's the phase right now". */
export function getCurrentGameweekPhase(gw: GameweekPhaseInput): GameweekStatus {
  return deriveGameweekPhase(gw, new Date());
}
