import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { LogoutButton } from "@/components/logout-button";

// `built: false` routes don't exist yet — they render as a disabled,
// greyed-out label instead of a dead link until that build step lands.
const PLAYER_LINKS = [
  { href: "/", label: "Dashboard", built: true },
  { href: "/league-table", label: "Table", built: true },
  { href: "/fines", label: "The Pot", built: true },
  { href: "/history", label: "History", built: false },
];

const ADMIN_LINKS = [
  { href: "/admin/gameweeks", label: "Gameweeks", built: true },
  { href: "/admin/results", label: "Results", built: true },
  { href: "/admin/teams", label: "Teams", built: true },
  { href: "/admin/seasons", label: "Seasons", built: true },
  { href: "/admin/players", label: "Players", built: false },
  { href: "/admin/fines", label: "Fine Ledger", built: false },
  { href: "/admin/settings", label: "Settings", built: false },
  { href: "/admin/audit-log", label: "Audit Log", built: false },
];

export async function NavBar() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 overflow-x-auto px-4 py-3">
        <Link href="/" className="mr-2 shrink-0 text-sm font-bold tracking-tight text-foreground">
          ⚽ Bad Blokes <span className="text-accent">Acca</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-1 text-sm">
          {PLAYER_LINKS.map((link) =>
            link.built ? (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                {link.label}
              </Link>
            ) : (
              <span
                key={link.href}
                title="Coming soon"
                className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-muted/40"
              >
                {link.label}
              </span>
            ),
          )}
          {user.role === "ADMIN" && (
            <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />
          )}
          {user.role === "ADMIN" &&
            ADMIN_LINKS.map((link) =>
              link.built ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-muted transition-colors hover:bg-surface hover:text-warn"
                >
                  {link.label}
                </Link>
              ) : (
                <span
                  key={link.href}
                  title="Coming soon"
                  className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-muted/40"
                >
                  {link.label}
                </span>
              ),
            )}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <span className="hidden text-xs text-muted sm:inline">{user.name}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
