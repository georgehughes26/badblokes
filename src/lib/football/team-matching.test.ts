import { describe, expect, it } from "vitest";
import { normalizeTeamName } from "./team-matching";

describe("normalizeTeamName", () => {
  it("strips a trailing FC", () => {
    expect(normalizeTeamName("Chelsea FC")).toBe("chelsea");
  });

  it("strips a trailing AFC", () => {
    expect(normalizeTeamName("Wimbledon AFC")).toBe("wimbledon");
  });

  it("strips a leading AFC", () => {
    expect(normalizeTeamName("AFC Bournemouth")).toBe("bournemouth");
  });

  it("leaves a name with no FC/AFC decoration unchanged (just cased)", () => {
    expect(normalizeTeamName("Arsenal")).toBe("arsenal");
  });

  it("matches equivalent names to the same normalized form", () => {
    expect(normalizeTeamName("Manchester United FC")).toBe(normalizeTeamName("Manchester United"));
    expect(normalizeTeamName("AFC Bournemouth")).toBe(normalizeTeamName("Bournemouth"));
  });
});
