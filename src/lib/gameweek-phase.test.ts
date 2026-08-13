import { describe, expect, it } from "vitest";
import { deriveGameweekPhase, type GameweekPhaseInput } from "./gameweek-phase";

function gw(overrides: Partial<GameweekPhaseInput> = {}): GameweekPhaseInput {
  return {
    status: "UPCOMING",
    picksOpenAt: new Date("2026-08-07T11:00:00.000Z"),
    pickDeadlineAt: new Date("2026-08-07T22:59:00.000Z"),
    ...overrides,
  };
}

describe("deriveGameweekPhase — automatic time-based transitions", () => {
  it("before picksOpenAt -> UPCOMING", () => {
    const now = new Date("2026-08-07T10:59:59.000Z");
    expect(deriveGameweekPhase(gw(), now)).toBe("UPCOMING");
  });

  it("exactly at picksOpenAt -> OPEN", () => {
    const now = new Date("2026-08-07T11:00:00.000Z");
    expect(deriveGameweekPhase(gw(), now)).toBe("OPEN");
  });

  it("between picksOpenAt and pickDeadlineAt -> OPEN", () => {
    const now = new Date("2026-08-07T18:00:00.000Z");
    expect(deriveGameweekPhase(gw(), now)).toBe("OPEN");
  });

  it("exactly at pickDeadlineAt -> LOCKED", () => {
    const now = new Date("2026-08-07T22:59:00.000Z");
    expect(deriveGameweekPhase(gw(), now)).toBe("LOCKED");
  });

  it("after pickDeadlineAt -> LOCKED", () => {
    const now = new Date("2026-08-08T00:00:00.000Z");
    expect(deriveGameweekPhase(gw(), now)).toBe("LOCKED");
  });
});

describe("deriveGameweekPhase — manual overrides always win", () => {
  it("SETTLED stays SETTLED even if picksOpenAt is still in the future", () => {
    const now = new Date("2026-08-01T00:00:00.000Z");
    expect(deriveGameweekPhase(gw({ status: "SETTLED" }), now)).toBe("SETTLED");
  });

  it("a manual LOCKED override sticks even during what would otherwise be the OPEN window", () => {
    const now = new Date("2026-08-07T18:00:00.000Z");
    expect(deriveGameweekPhase(gw({ status: "LOCKED" }), now)).toBe("LOCKED");
  });

  it("a stored status of OPEN (legacy/stale data) is not treated as a sticky override — still derived from time", () => {
    const now = new Date("2026-08-07T10:00:00.000Z"); // before picksOpenAt
    expect(deriveGameweekPhase(gw({ status: "OPEN" }), now)).toBe("UPCOMING");
  });
});
