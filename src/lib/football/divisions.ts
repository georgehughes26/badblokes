/** The English divisions we auto-import from openfootball (tiers 1-4). National League (tier 5) stays manual — see provider.ts. */
export const DIVISIONS = [
  { label: "Premier League", file: "1-premierleague.txt" },
  { label: "Championship", file: "2-championship.txt" },
  { label: "League One", file: "3-league1.txt" },
  { label: "League Two", file: "4-league2.txt" },
] as const;

export type DivisionLabel = (typeof DIVISIONS)[number]["label"];
