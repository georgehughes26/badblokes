"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";

function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2.25 12 11.204 3.045a1.125 1.125 0 0 1 1.591 0L21.75 12" />
      <path d="M4.5 9.75V19.5c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V20.625h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
    </svg>
  );
}

function TableIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
    </svg>
  );
}

function PotIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2.25" y="6" width="19.5" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M5.25 9v.008M18.75 15v.008" />
    </svg>
  );
}

function ProfileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8.25" r="3.375" />
      <path d="M4.5 19.875c0-3.386 3.357-6.375 7.5-6.375s7.5 2.989 7.5 6.375" />
    </svg>
  );
}

function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3.375c2.15 2.038 5.054 3.286 8.25 3.286 0 6.784-3.973 11.238-8.25 12.464-4.277-1.226-8.25-5.68-8.25-12.464 3.196 0 6.1-1.248 8.25-3.286Z" />
      <path d="m9 12.375 2.25 2.25 3.75-4.125" />
    </svg>
  );
}

interface TabItem {
  href: string;
  label: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
  built: boolean;
}

export function MobileTabBarClient({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const items: TabItem[] = [
    { href: "/", label: "Dashboard", icon: HomeIcon, built: true },
    { href: "/league-table", label: "Table", icon: TableIcon, built: true },
    { href: "/fines", label: "The Pot", icon: PotIcon, built: true },
    { href: "/history", label: "Profile", icon: ProfileIcon, built: true },
  ];
  if (isAdmin) {
    items.push({ href: "/admin/gameweeks", label: "Admin", icon: ShieldIcon, built: true });
  }

  return (
    <nav
      aria-label="Primary"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur sm:hidden"
    >
      <div className="mx-auto flex max-w-6xl items-stretch justify-around px-1">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          if (!item.built) {
            return (
              <span
                key={item.href}
                title="Coming soon"
                className="flex min-w-14 flex-1 flex-col items-center gap-1 px-1 py-2.5 text-muted/40"
              >
                <item.icon className="h-6 w-6" />
                <span className="text-[11px] font-medium">{item.label}</span>
              </span>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex min-w-14 flex-1 flex-col items-center gap-1 px-1 py-2.5 transition-colors",
                active ? "text-accent" : "text-muted active:text-foreground",
              ].join(" ")}
            >
              <item.icon className="h-6 w-6" strokeWidth={active ? 2.1 : 1.8} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
