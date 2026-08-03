import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { LogoutButton } from "@/components/logout-button";
import { LogoMark } from "@/components/logo";
import { PLAYER_LINKS, ADMIN_LINKS } from "@/lib/nav-links";

export async function NavBar() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <header className="pt-safe sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="mr-2 flex shrink-0 items-center gap-1.5 font-display text-lg font-bold tracking-tight text-foreground">
          <LogoMark className="h-5 w-5 text-accent" />
          Bad Blokes <span className="text-accent">Acca</span>
        </Link>

        <nav className="hidden shrink-0 items-center gap-1 overflow-x-auto text-sm sm:flex">
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
              <span key={link.href} title="Coming soon" className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-muted/40">
                {link.label}
              </span>
            ),
          )}
          {user.role === "ADMIN" && <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />}
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
                <span key={link.href} title="Coming soon" className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-muted/40">
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
