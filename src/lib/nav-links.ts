export interface NavLink {
  href: string;
  label: string;
  built: boolean;
}

// `built: false` routes don't exist yet — they render as a disabled,
// greyed-out label instead of a dead link until that build step lands.
export const PLAYER_LINKS: NavLink[] = [
  { href: "/", label: "Dashboard", built: true },
  { href: "/league-table", label: "Table", built: true },
  { href: "/fines", label: "The Pot", built: true },
  { href: "/history", label: "Profile", built: true },
];

export const ADMIN_LINKS: NavLink[] = [
  { href: "/admin/gameweeks", label: "Gameweeks", built: true },
  { href: "/admin/results", label: "Results", built: true },
  { href: "/admin/teams", label: "Teams", built: true },
  { href: "/admin/seasons", label: "Seasons", built: true },
  { href: "/admin/players", label: "Players", built: false },
  { href: "/admin/fines", label: "Fine Ledger", built: false },
  { href: "/admin/settings", label: "Settings", built: false },
  { href: "/admin/audit-log", label: "Audit Log", built: false },
];
