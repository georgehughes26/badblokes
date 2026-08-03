import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";

const ADMIN_TABS = [
  { href: "/admin/gameweeks", label: "Gameweeks" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/seasons", label: "Seasons" },
  { href: "/admin/results", label: "Results" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/fines", label: "Fine Ledger" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/audit-log", label: "Audit Log" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="space-y-5">
      <div>
        <p className="pill-amber mb-2 w-fit">Admin</p>
        <nav className="flex flex-nowrap gap-1 overflow-x-auto border-b border-border pb-3 text-sm">
          {ADMIN_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
