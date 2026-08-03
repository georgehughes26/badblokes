import { describe, expect, it } from "vitest";
import { getCurrentSeasonFolder, getPreviousSeasonFolder } from "./season-folder";

describe("getCurrentSeasonFolder", () => {
  it("is mid-season for a date in the following spring", () => {
    expect(getCurrentSeasonFolder(new Date("2027-03-15T00:00:00Z"))).toBe("2026-27");
  });

  it("rolls to the new season from July", () => {
    expect(getCurrentSeasonFolder(new Date("2026-07-01T00:00:00Z"))).toBe("2026-27");
  });

  it("is still the previous season in June", () => {
    expect(getCurrentSeasonFolder(new Date("2026-06-30T23:59:59Z"))).toBe("2025-26");
  });

  it("handles the turn of the (calendar) year correctly", () => {
    expect(getCurrentSeasonFolder(new Date("2027-01-01T00:00:00Z"))).toBe("2026-27");
  });
});

describe("getPreviousSeasonFolder", () => {
  it("steps back one season", () => {
    expect(getPreviousSeasonFolder("2026-27")).toBe("2025-26");
  });

  it("handles a century rollover in the short year", () => {
    expect(getPreviousSeasonFolder("2100-01")).toBe("2099-00");
  });
});
