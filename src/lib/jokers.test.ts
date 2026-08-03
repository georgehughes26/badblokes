import { describe, expect, it } from "vitest";
import {
  canPlayJoker,
  getJokerAvailability,
  getJokerHalf,
} from "./jokers";

const CHRISTMAS = new Date("2026-12-25T00:00:00Z");

describe("getJokerHalf", () => {
  it("a gameweek deadline before the split date is H1", () => {
    expect(getJokerHalf(new Date("2026-10-01T23:59:00Z"), CHRISTMAS)).toBe("H1");
  });

  it("a gameweek deadline on or after the split date is H2", () => {
    expect(getJokerHalf(new Date("2026-12-25T00:00:00Z"), CHRISTMAS)).toBe("H2");
    expect(getJokerHalf(new Date("2027-02-01T23:59:00Z"), CHRISTMAS)).toBe("H2");
  });
});

describe("canPlayJoker", () => {
  it("allows a joker when none has been played in that half yet", () => {
    expect(canPlayJoker([], "H1")).toBe(true);
  });

  it("rejects a second joker in the same half", () => {
    expect(canPlayJoker(["H1"], "H1")).toBe(false);
  });

  it("a joker used in H1 doesn't block a joker in H2", () => {
    expect(canPlayJoker(["H1"], "H2")).toBe(true);
  });

  it("respects a configured allowance greater than one", () => {
    expect(canPlayJoker(["H1"], "H1", { jokersPerHalf: 2 })).toBe(true);
    expect(canPlayJoker(["H1", "H1"], "H1", { jokersPerHalf: 2 })).toBe(false);
  });
});

describe("getJokerAvailability", () => {
  it("reports remaining jokers and half for a fresh player", () => {
    const availability = getJokerAvailability(
      new Date("2026-10-01T23:59:00Z"),
      CHRISTMAS,
      [],
    );
    expect(availability).toEqual({ half: "H1", used: 0, remaining: 1, available: true });
  });

  it("reports unavailable once the half's joker is spent", () => {
    const availability = getJokerAvailability(
      new Date("2026-10-01T23:59:00Z"),
      CHRISTMAS,
      ["H1"],
    );
    expect(availability.available).toBe(false);
    expect(availability.remaining).toBe(0);
  });
});
