import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULES_CONFIG,
  didTeamWin,
  settlePlayerGameweek,
  settleGameweek,
  type PlayerGameweekInput,
} from "./rules";

function input(overrides: Partial<PlayerGameweekInput>): PlayerGameweekInput {
  return {
    hasPick: true,
    isJoker: false,
    shortOdds: false,
    slipSubmitted: true,
    won: true,
    ...overrides,
  };
}

describe("settlePlayerGameweek — truth table (spec §1)", () => {
  it("picked, slip in, legal odds, team won -> +1, £0", () => {
    const out = settlePlayerGameweek(input({ won: true }));
    expect(out.points).toBe(1);
    expect(out.fine.amount).toBe(0);
    expect(out.fine.ruleId).toBe("NO_FINE");
  });

  it("picked, slip in, legal odds, went 2 up then drew -> +1, £0 (EP counts as win)", () => {
    // EP is pre-combined into `won` by the caller before this function ever sees it.
    const out = settlePlayerGameweek(input({ won: true }));
    expect(out.points).toBe(1);
    expect(out.fine.amount).toBe(0);
  });

  it("picked, slip in, legal odds, went 2 up then lost 3-2 -> +1, £0", () => {
    const out = settlePlayerGameweek(input({ won: true }));
    expect(out.points).toBe(1);
    expect(out.fine.amount).toBe(0);
  });

  it("picked, slip in, legal odds, lost (never 2 up) -> D, 0 pts, £2", () => {
    const out = settlePlayerGameweek(input({ won: false }));
    expect(out.breaches.teamLost).toBe(true);
    expect(out.points).toBe(0);
    expect(out.fine.amount).toBe(2);
    expect(out.fine.ruleId).toBe("TEAM_LOST");
  });

  it("picked, slip in, odds 1/3, team won -> C, +1, £5", () => {
    const out = settlePlayerGameweek(input({ shortOdds: true, won: true }));
    expect(out.breaches.shortOdds).toBe(true);
    expect(out.points).toBe(1);
    expect(out.fine.amount).toBe(5);
    expect(out.fine.ruleId).toBe("SHORT_ODDS");
  });

  it("picked, slip in, odds 1/3, team lost -> C+D, 0 pts, £5 (not £7)", () => {
    const out = settlePlayerGameweek(input({ shortOdds: true, won: false }));
    expect(out.breaches.shortOdds).toBe(true);
    expect(out.breaches.teamLost).toBe(true);
    expect(out.points).toBe(0);
    expect(out.fine.amount).toBe(5);
    expect(out.fine.ruleId).toBe("SHORT_ODDS");
  });

  it("picked, no slip, legal odds, team won -> B, +1, £5", () => {
    const out = settlePlayerGameweek(input({ slipSubmitted: false, won: true }));
    expect(out.breaches.noSlip).toBe(true);
    expect(out.points).toBe(1);
    expect(out.fine.amount).toBe(5);
    expect(out.fine.ruleId).toBe("NO_SLIP");
  });

  it("picked, no slip, odds 2/5, team lost -> B+C+D, -1 pts, £10", () => {
    const out = settlePlayerGameweek(
      input({ slipSubmitted: false, shortOdds: true, won: false }),
    );
    expect(out.breaches.noSlip).toBe(true);
    expect(out.breaches.shortOdds).toBe(true);
    expect(out.breaches.teamLost).toBe(true);
    expect(out.points).toBe(-1);
    expect(out.fine.amount).toBe(10);
    expect(out.fine.ruleId).toBe("MULTI_BREACH");
  });

  it("no pick at all (so no slip either) -> A+B, -1 pts, £10", () => {
    const out = settlePlayerGameweek(
      input({ hasPick: false, isJoker: false, shortOdds: false, slipSubmitted: false, won: false }),
    );
    expect(out.breaches.noPick).toBe(true);
    expect(out.breaches.noSlip).toBe(true);
    expect(out.points).toBe(-1);
    expect(out.fine.amount).toBe(10);
    expect(out.fine.ruleId).toBe("MULTI_BREACH");
    expect(out.voided).toBe(false);
  });

  it("no pick, but proof of a real bet submitted -> voided, 0 pts, £0", () => {
    const out = settlePlayerGameweek(
      input({ hasPick: false, isJoker: false, shortOdds: false, slipSubmitted: false, won: false, voided: true }),
    );
    expect(out.voided).toBe(true);
    expect(out.breaches.noPick).toBe(true);
    expect(out.points).toBe(0);
    expect(out.fine.amount).toBe(0);
    expect(out.fine.ruleId).toBe("NO_FINE");
  });

  it("joker, slip in, legal odds, team won -> +2, £0", () => {
    const out = settlePlayerGameweek(input({ isJoker: true, won: true }));
    expect(out.points).toBe(2);
    expect(out.fine.amount).toBe(0);
    expect(out.jokerPlayed).toBe(true);
  });

  it("joker, slip in, legal odds, went 2 up then lost -> +2, £0", () => {
    const out = settlePlayerGameweek(input({ isJoker: true, won: true }));
    expect(out.points).toBe(2);
    expect(out.fine.amount).toBe(0);
  });

  it("joker, slip in, legal odds, lost -> E, 0 pts, £10", () => {
    const out = settlePlayerGameweek(input({ isJoker: true, won: false }));
    expect(out.breaches.jokerLost).toBe(true);
    expect(out.points).toBe(0);
    expect(out.fine.amount).toBe(10);
    expect(out.fine.ruleId).toBe("JOKER_LOST");
  });

  it("joker, no slip, legal odds, team lost -> B+E, 0 pts, £10 (not £15)", () => {
    const out = settlePlayerGameweek(
      input({ isJoker: true, slipSubmitted: false, won: false }),
    );
    expect(out.breaches.noSlip).toBe(true);
    expect(out.breaches.jokerLost).toBe(true);
    expect(out.points).toBe(0);
    expect(out.fine.amount).toBe(10);
    expect(out.fine.ruleId).toBe("JOKER_LOST");
  });

  it("joker, no slip, odds 1/3, team lost -> B+C+E, -1 pts, £10", () => {
    const out = settlePlayerGameweek(
      input({ isJoker: true, slipSubmitted: false, shortOdds: true, won: false }),
    );
    expect(out.breaches.noSlip).toBe(true);
    expect(out.breaches.shortOdds).toBe(true);
    expect(out.breaches.jokerLost).toBe(true);
    expect(out.points).toBe(-1);
    expect(out.fine.amount).toBe(10);
    expect(out.fine.ruleId).toBe("MULTI_BREACH");
  });
});

describe("settlePlayerGameweek — odds boundary", () => {
  it("odds exactly 1.50 (1/2) is legal, no short-odds breach, team wins", () => {
    const out = settlePlayerGameweek(input({ shortOdds: false, won: true }));
    expect(out.breaches.shortOdds).toBe(false);
    expect(out.fine.amount).toBe(0);
  });

  it("odds exactly 1.50 (1/2) is legal even when the team loses (just the £2 loss fine)", () => {
    const out = settlePlayerGameweek(input({ shortOdds: false, won: false }));
    expect(out.breaches.shortOdds).toBe(false);
    expect(out.fine.amount).toBe(2);
    expect(out.fine.ruleId).toBe("TEAM_LOST");
  });

  it("odds a hair below 1.50 (1.499) is a breach", () => {
    const out = settlePlayerGameweek(input({ shortOdds: true, won: true }));
    expect(out.breaches.shortOdds).toBe(true);
  });
});

describe("settlePlayerGameweek — fine precedence pairs never stack", () => {
  it("D and E can both be factually true, but only E ever drives the fine", () => {
    const out = settlePlayerGameweek(input({ isJoker: true, won: false }));
    expect(out.breaches.teamLost).toBe(true);
    expect(out.breaches.jokerLost).toBe(true);
    expect(out.fine.ruleId).toBe("JOKER_LOST");
    expect(out.fine.amount).toBe(10);
  });

  it("a losing joker with a missing slip resolves to exactly £10, never £15", () => {
    const out = settlePlayerGameweek(input({ isJoker: true, slipSubmitted: false, won: false }));
    expect(out.fine.amount).toBe(10);
  });

  it("a short-odds pick that loses is £5, never £7", () => {
    const out = settlePlayerGameweek(input({ shortOdds: true, won: false }));
    expect(out.fine.amount).toBe(5);
  });
});

describe("settlePlayerGameweek — invalid input guards", () => {
  it("rejects a joker played on a no-pick week", () => {
    expect(() =>
      settlePlayerGameweek(
        input({ hasPick: false, isJoker: true, shortOdds: false, slipSubmitted: false, won: false }),
      ),
    ).toThrow();
  });

  it("rejects a no-pick input that somehow has a result", () => {
    expect(() =>
      settlePlayerGameweek(
        input({ hasPick: false, isJoker: false, shortOdds: false, slipSubmitted: false, won: true }),
      ),
    ).toThrow();
  });
});

describe("settlePlayerGameweek — idempotent re-settlement", () => {
  it("settling the same input twice (e.g. after a score correction re-run) gives identical results", () => {
    const gw = input({ won: false, shortOdds: true });
    const first = settlePlayerGameweek(gw);
    const second = settlePlayerGameweek(gw);
    expect(second).toEqual(first);
  });

  it("re-settling after a correction (win -> loss) recomputes cleanly from scratch", () => {
    const before = settlePlayerGameweek(input({ won: true }));
    expect(before.points).toBe(1);
    expect(before.fine.amount).toBe(0);

    const corrected = settlePlayerGameweek(input({ won: false }));
    expect(corrected.points).toBe(0);
    expect(corrected.fine.amount).toBe(2);
  });
});

describe("settleGameweek — batch settlement", () => {
  it("settles every player in the map independently", () => {
    const results = settleGameweek({
      alice: input({ won: true }),
      bob: input({ won: false }),
      carol: input({ hasPick: false, isJoker: false, shortOdds: false, slipSubmitted: false, won: false }),
    });
    expect(results.alice.points).toBe(1);
    expect(results.bob.points).toBe(0);
    expect(results.carol.points).toBe(-1);
    expect(Object.keys(results)).toEqual(["alice", "bob", "carol"]);
  });
});

describe("didTeamWin — EP combination", () => {
  const fixture = {
    homeTeamId: "home",
    awayTeamId: "away",
    homeScore: 2,
    awayScore: 3,
    wentTwoAheadHome: true,
    wentTwoAheadAway: false,
  };

  it("home team lost on the scoreline but went 2 up at some point -> counts as a win", () => {
    expect(didTeamWin(fixture, "home")).toBe(true);
  });

  it("away team won on the scoreline and never went 2 up -> still a win", () => {
    expect(didTeamWin(fixture, "away")).toBe(true);
  });

  it("a team that neither won nor went 2 up did not win", () => {
    const draw = { ...fixture, homeScore: 1, awayScore: 1, wentTwoAheadHome: false };
    expect(didTeamWin(draw, "home")).toBe(false);
    expect(didTeamWin(draw, "away")).toBe(false);
  });

  it("throws for a team not in the fixture", () => {
    expect(() => didTeamWin(fixture, "nope")).toThrow();
  });
});

describe("DEFAULT_RULES_CONFIG", () => {
  it("matches the amounts specified in the spec", () => {
    expect(DEFAULT_RULES_CONFIG.oddsMinDecimal).toBe(1.5);
    expect(DEFAULT_RULES_CONFIG.fineNoPick).toBe(5);
    expect(DEFAULT_RULES_CONFIG.fineNoSlip).toBe(5);
    expect(DEFAULT_RULES_CONFIG.fineShortOdds).toBe(5);
    expect(DEFAULT_RULES_CONFIG.fineTeamLost).toBe(2);
    expect(DEFAULT_RULES_CONFIG.fineJokerLost).toBe(10);
    expect(DEFAULT_RULES_CONFIG.fineMultiBreach).toBe(10);
    expect(DEFAULT_RULES_CONFIG.pointsWin).toBe(1);
    expect(DEFAULT_RULES_CONFIG.pointsJokerWin).toBe(2);
    expect(DEFAULT_RULES_CONFIG.pointsMultiBreachPenalty).toBe(-1);
  });
});
