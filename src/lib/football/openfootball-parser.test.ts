import { describe, expect, it } from "vitest";
import { parseFootballTxt } from "./openfootball-parser";

const SAMPLE = `
= English National League 2025/26

# Date       Sat Aug 9 2025 - Wed Dec 30 2026 (508d)
# Teams      24
# Matches    552



▪ 1. Round
  Sat Aug 9 2025
    14:00  Altrincham FC           v Aldershot Town           3-2 (2-0)
           Boreham Wood            v Rochdale AFC             0-2 (0-0)
           Yeovil Town             v Hartlepool United        0-0
  Tue Oct 21
    18:45  Boston United           v Morecambe FC             0-4 (0-2)


▪ 2. Round
  Sat Aug 16
    11:30  Rochdale AFC            v Altrincham FC            2-1 (1-1)
    14:00  Aldershot Town          v Boston United            2-3 (0-1)
`;

describe("parseFootballTxt", () => {
  it("parses matches with an explicit kick-off time and a score", () => {
    const matches = parseFootballTxt(SAMPLE);
    const first = matches[0];
    expect(first).toEqual({
      date: "2025-08-09",
      time: "14:00",
      homeTeam: "Altrincham FC",
      awayTeam: "Aldershot Town",
      homeScore: 3,
      awayScore: 2,
    });
  });

  it("inherits the kick-off time from the previous match line when omitted", () => {
    const matches = parseFootballTxt(SAMPLE);
    const second = matches.find((m) => m.homeTeam === "Boreham Wood");
    expect(second?.time).toBe("14:00");
    expect(second?.date).toBe("2025-08-09");
  });

  it("parses a 0-0 draw correctly (not confused with 'no score yet')", () => {
    const matches = parseFootballTxt(SAMPLE);
    const draw = matches.find((m) => m.homeTeam === "Yeovil Town");
    expect(draw?.homeScore).toBe(0);
    expect(draw?.awayScore).toBe(0);
  });

  it("carries the year forward for date lines that omit it", () => {
    const matches = parseFootballTxt(SAMPLE);
    const rescheduled = matches.find((m) => m.homeTeam === "Boston United" && m.awayTeam === "Morecambe FC");
    expect(rescheduled?.date).toBe("2025-10-21");
  });

  it("resets the inherited time across a new date line", () => {
    const matches = parseFootballTxt(SAMPLE);
    const round2 = matches.filter((m) => m.date === "2025-08-16");
    expect(round2.map((m) => m.time)).toEqual(["11:30", "14:00"]);
  });

  it("leaves scores null for fixtures that haven't been played yet", () => {
    const upcoming = parseFootballTxt(`
▪ 10. Round
  Sat Jan 3 2026
    15:00  Team A                  v Team B
`);
    expect(upcoming).toEqual([
      { date: "2026-01-03", time: "15:00", homeTeam: "Team A", awayTeam: "Team B", homeScore: null, awayScore: null },
    ]);
  });

  it("picks up the restated year on the first date after a year boundary", () => {
    // The source always restates the year on the first date line after it
    // changes (e.g. real data: "Thu Jan 1 2026") rather than expecting us
    // to infer it, so we don't need to guess from month order.
    const text = `
▪ 20. Round
  Sat Dec 27 2025
    15:00  Team A                  v Team B                   1-0
▪ 21. Round
  Thu Jan 1 2026
    15:00  Team C                  v Team D                   2-2
`;
    const matches = parseFootballTxt(text);
    expect(matches[0].date).toBe("2025-12-27");
    expect(matches[1].date).toBe("2026-01-01");
  });

  it("returns an empty array for text with no matches", () => {
    expect(parseFootballTxt("= Empty League 2025/26\n# Teams 0\n")).toEqual([]);
  });

  describe("Style B (Premier League results, score between team names, no literal 'v')", () => {
    const PL_SAMPLE = `
= England | Premier League 2025/26

# Dates    Fri Aug 15 2025 - Sun May 24 2026 (282d)
# Teams    20
# Matches  380

▪ Regular Season - 1
Fri Aug 15 2025
  19:00   Liverpool  4-2 (1-0)  Bournemouth
                  (Hugo EKITIKE 37', Cody GAKPO 49', Federico Chiesa 88', MOHAMED SALAH 90+4';
                   Antoine SEMENYO 64', 76')
Sat Aug 16
  12:30   Aston Villa  0-0 (0-0)  Newcastle United
  14:00   Sunderland  3-0 (0-0)  West Ham United
                  (Eliezer Mayenda 61', Daniel BALLARD 73', Wilson Isidor 90+2')
`;

    it("parses the score sandwiched between team names", () => {
      const matches = parseFootballTxt(PL_SAMPLE);
      expect(matches[0]).toEqual({
        date: "2025-08-15",
        time: "19:00",
        homeTeam: "Liverpool",
        awayTeam: "Bournemouth",
        homeScore: 4,
        awayScore: 2,
      });
    });

    it("ignores the indented goalscorer continuation lines", () => {
      const matches = parseFootballTxt(PL_SAMPLE);
      expect(matches).toHaveLength(3);
      expect(matches.some((m) => m.homeTeam.includes("EKITIKE"))).toBe(false);
    });

    it("parses a scoreless draw and a later match on the same date", () => {
      const matches = parseFootballTxt(PL_SAMPLE);
      expect(matches[1]).toEqual({
        date: "2025-08-16",
        time: "12:30",
        homeTeam: "Aston Villa",
        awayTeam: "Newcastle United",
        homeScore: 0,
        awayScore: 0,
      });
      expect(matches[2].homeTeam).toBe("Sunderland");
      expect(matches[2].time).toBe("14:00");
    });
  });
});
