import { describe, expect, it } from "vitest";
import { isOddsLegal, parseOdds } from "./odds";

describe("parseOdds", () => {
  it("parses simple fractional odds", () => {
    expect(parseOdds("2/1")).toBeCloseTo(3.0);
    expect(parseOdds("11/10")).toBeCloseTo(2.1);
    expect(parseOdds("1/2")).toBeCloseTo(1.5);
    expect(parseOdds("2/5")).toBeCloseTo(1.4);
    expect(parseOdds("1/3")).toBeCloseTo(1.3333, 3);
    expect(parseOdds("1/4")).toBeCloseTo(1.25);
  });

  it("parses 'evens' in its common spellings", () => {
    expect(parseOdds("evens")).toBe(2.0);
    expect(parseOdds("Evens")).toBe(2.0);
    expect(parseOdds("evs")).toBe(2.0);
  });

  it("parses decimal odds", () => {
    expect(parseOdds("3.00")).toBe(3.0);
    expect(parseOdds("1.5")).toBe(1.5);
    expect(parseOdds("2")).toBe(2);
  });

  it("returns null for garbage input", () => {
    expect(parseOdds("")).toBeNull();
    expect(parseOdds("nonsense")).toBeNull();
    expect(parseOdds("1/0")).toBeNull();
    expect(parseOdds("a/b")).toBeNull();
    expect(parseOdds("0.5")).toBeNull();
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseOdds("  2/1  ")).toBeCloseTo(3.0);
  });
});

describe("isOddsLegal", () => {
  it("exactly 1.50 is legal", () => {
    expect(isOddsLegal(1.5, 1.5)).toBe(true);
  });

  it("anything shorter than 1.50 is not legal", () => {
    expect(isOddsLegal(1.499, 1.5)).toBe(false);
    expect(isOddsLegal(1.25, 1.5)).toBe(false);
  });

  it("anything longer than 1.50 is legal", () => {
    expect(isOddsLegal(3.0, 1.5)).toBe(true);
  });
});
