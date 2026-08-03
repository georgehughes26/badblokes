import { describe, expect, it } from "vitest";
import {
  computeGameweekDeadlines,
  isBefore,
  isThreePmLondon,
  isWithinWindow,
  londonWallTimeToUtc,
  parseLondonDatetimeLocal,
  toLondonDatetimeLocal,
} from "./time";

describe("londonWallTimeToUtc — BST/GMT correctness", () => {
  it("Friday 12:00 in October (BST, UTC+1) is 11:00 UTC", () => {
    const utc = londonWallTimeToUtc(2026, 10, 23, 12, 0);
    expect(utc.toISOString()).toBe("2026-10-23T11:00:00.000Z");
  });

  it("Friday 12:00 in November (GMT, UTC+0) is 12:00 UTC", () => {
    const utc = londonWallTimeToUtc(2026, 10, 30, 12, 0);
    expect(utc.toISOString()).toBe("2026-10-30T12:00:00.000Z");
  });

  it("Friday 12:00 in March, before the spring-forward, is GMT (12:00 UTC)", () => {
    const utc = londonWallTimeToUtc(2026, 3, 27, 12, 0);
    expect(utc.toISOString()).toBe("2026-03-27T12:00:00.000Z");
  });

  it("Friday 12:00 in April, after the spring-forward, is BST (11:00 UTC)", () => {
    const utc = londonWallTimeToUtc(2026, 4, 3, 12, 0);
    expect(utc.toISOString()).toBe("2026-04-03T11:00:00.000Z");
  });
});

describe("computeGameweekDeadlines — BST/GMT boundary weekends", () => {
  it("a gameweek entirely within BST (Sat 24 Oct 2026)", () => {
    const d = computeGameweekDeadlines(2026, 10, 24);
    expect(d.picksOpenAt.toISOString()).toBe("2026-10-23T11:00:00.000Z");
    expect(d.pickDeadlineAt.toISOString()).toBe("2026-10-23T22:59:00.000Z");
    expect(d.slipDeadlineAt.toISOString()).toBe("2026-10-24T14:00:00.000Z");
  });

  it("a gameweek the week after clocks go back (Sat 31 Oct 2026, now GMT)", () => {
    const d = computeGameweekDeadlines(2026, 10, 31);
    expect(d.picksOpenAt.toISOString()).toBe("2026-10-30T12:00:00.000Z");
    expect(d.pickDeadlineAt.toISOString()).toBe("2026-10-30T23:59:00.000Z");
    expect(d.slipDeadlineAt.toISOString()).toBe("2026-10-31T15:00:00.000Z");
  });

  it("a gameweek before clocks go forward (Sat 28 Mar 2026, GMT)", () => {
    const d = computeGameweekDeadlines(2026, 3, 28);
    expect(d.picksOpenAt.toISOString()).toBe("2026-03-27T12:00:00.000Z");
    expect(d.slipDeadlineAt.toISOString()).toBe("2026-03-28T15:00:00.000Z");
  });

  it("a gameweek after clocks go forward (Sat 4 Apr 2026, BST)", () => {
    const d = computeGameweekDeadlines(2026, 4, 4);
    expect(d.picksOpenAt.toISOString()).toBe("2026-04-03T11:00:00.000Z");
    expect(d.slipDeadlineAt.toISOString()).toBe("2026-04-04T14:00:00.000Z");
  });

  it("rejects a date that isn't a Saturday", () => {
    expect(() => computeGameweekDeadlines(2026, 10, 23)).toThrow();
  });
});

describe("datetime-local round trip (admin deadline-override form)", () => {
  it("parses a datetime-local value as Europe/London wall time (BST)", () => {
    const utc = parseLondonDatetimeLocal("2026-08-08T15:00");
    expect(utc.toISOString()).toBe("2026-08-08T14:00:00.000Z");
  });

  it("parses a datetime-local value as Europe/London wall time (GMT)", () => {
    const utc = parseLondonDatetimeLocal("2026-12-25T15:00");
    expect(utc.toISOString()).toBe("2026-12-25T15:00:00.000Z");
  });

  it("round-trips back to the same wall-clock string", () => {
    const original = "2026-08-08T15:00";
    const utc = parseLondonDatetimeLocal(original);
    expect(toLondonDatetimeLocal(utc)).toBe(original);
  });
});

describe("isThreePmLondon", () => {
  it("is true for a 15:00 BST kick-off", () => {
    expect(isThreePmLondon(londonWallTimeToUtc(2026, 8, 8, 15, 0))).toBe(true);
  });

  it("is true for a 15:00 GMT kick-off", () => {
    expect(isThreePmLondon(londonWallTimeToUtc(2026, 12, 5, 15, 0))).toBe(true);
  });

  it("is false for a 12:30 or 17:30 kick-off", () => {
    expect(isThreePmLondon(londonWallTimeToUtc(2026, 8, 8, 12, 30))).toBe(false);
    expect(isThreePmLondon(londonWallTimeToUtc(2026, 8, 8, 17, 30))).toBe(false);
  });
});

describe("isWithinWindow / isBefore — slip deadline edge (14:59:59 vs 15:00:01)", () => {
  const deadlines = computeGameweekDeadlines(2026, 10, 24); // Sat 24 Oct 2026, BST

  it("a slip submitted at 14:59:59 BST is on time", () => {
    const submittedAt = new Date(deadlines.slipDeadlineAt.getTime() - 1000);
    expect(isBefore(submittedAt, deadlines.slipDeadlineAt)).toBe(true);
  });

  it("a slip submitted at exactly the deadline instant is too late", () => {
    expect(isBefore(deadlines.slipDeadlineAt, deadlines.slipDeadlineAt)).toBe(false);
  });

  it("a slip submitted at 15:00:01 BST is too late", () => {
    const submittedAt = new Date(deadlines.slipDeadlineAt.getTime() + 1000);
    expect(isBefore(submittedAt, deadlines.slipDeadlineAt)).toBe(false);
  });

  it("picks are only accepted within [picksOpenAt, pickDeadlineAt)", () => {
    const beforeOpen = new Date(deadlines.picksOpenAt.getTime() - 1000);
    const justAfterOpen = new Date(deadlines.picksOpenAt.getTime() + 1000);
    const justBeforeDeadline = new Date(deadlines.pickDeadlineAt.getTime() - 1000);
    const afterDeadline = new Date(deadlines.pickDeadlineAt.getTime() + 1000);

    expect(isWithinWindow(beforeOpen, deadlines.picksOpenAt, deadlines.pickDeadlineAt)).toBe(false);
    expect(isWithinWindow(justAfterOpen, deadlines.picksOpenAt, deadlines.pickDeadlineAt)).toBe(true);
    expect(isWithinWindow(justBeforeDeadline, deadlines.picksOpenAt, deadlines.pickDeadlineAt)).toBe(true);
    expect(isWithinWindow(afterDeadline, deadlines.picksOpenAt, deadlines.pickDeadlineAt)).toBe(false);
  });
});
