import { describe, expect, it } from "vitest";
import { isTeamOnCooldown } from "./cooldown";

describe("isTeamOnCooldown", () => {
  it("blocks picking the same team as the immediately preceding gameweek", () => {
    expect(isTeamOnCooldown("arsenal", "arsenal")).toBe(true);
  });

  it("allows a different team", () => {
    expect(isTeamOnCooldown("arsenal", "chelsea")).toBe(false);
  });

  it("allows any team when there was no pick last gameweek", () => {
    expect(isTeamOnCooldown(null, "arsenal")).toBe(false);
  });

  it("allows coming back to a team the week after (one-week cooldown only)", () => {
    // GW1: arsenal, GW2: chelsea (cooldown was vs arsenal, chelsea ok),
    // GW3: cooldown is now vs chelsea, so arsenal is fine again.
    const gw2Cooldown = isTeamOnCooldown("arsenal", "chelsea");
    expect(gw2Cooldown).toBe(false);
    const gw3Cooldown = isTeamOnCooldown("chelsea", "arsenal");
    expect(gw3Cooldown).toBe(false);
  });
});
