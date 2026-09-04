function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** "2024 Champion", "2024 and 2026 Champion", "2024, 2025 and 2026 Champion" — or null if they've never won the league outright. */
function championLine(years: string[]): string | null {
  if (years.length === 0) return null;
  const list = years.length === 1 ? years[0] : `${years.slice(0, -1).join(", ")} and ${years[years.length - 1]}`;
  return `${list} Champion`;
}

export function ProfileHeader({ name, championYears }: { name: string; championYears: string[] }) {
  const subtitle = championLine(championYears);
  return (
    <div className="card flex items-center gap-4 py-6">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent/15 font-display text-2xl font-bold text-accent">
        {getInitials(name)}
      </span>
      <div className="min-w-0">
        <p className="font-display truncate text-2xl font-bold">{name}</p>
        {subtitle && <p className="pill-amber mt-1 w-fit">{subtitle}</p>}
      </div>
    </div>
  );
}
