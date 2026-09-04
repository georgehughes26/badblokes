import { formatLondon } from "@/lib/time";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function ProfileHeader({ name, joinedAt }: { name: string; joinedAt: Date }) {
  return (
    <div className="card flex items-center gap-4 py-6">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent/15 font-display text-2xl font-bold text-accent">
        {getInitials(name)}
      </span>
      <div className="min-w-0">
        <p className="font-display truncate text-2xl font-bold">{name}</p>
        <p className="text-xs text-muted">Bad Blokes Acca since {formatLondon(joinedAt, "MMM yyyy")}</p>
      </div>
    </div>
  );
}
