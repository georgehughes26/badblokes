import type { SVGProps } from "react";
import type { Trophy } from "@/lib/trophies";

function TrophyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7.5 4.5h9v4.5a4.5 4.5 0 0 1-9 0V4.5Z" />
      <path d="M7.5 6H4.5a2.25 2.25 0 0 0 2.25 2.25M16.5 6h3a2.25 2.25 0 0 1-2.25 2.25" />
      <path d="M12 13.5v3M9 19.5h6M8.25 19.5v-1.5a2.25 2.25 0 0 1 2.25-2.25h3a2.25 2.25 0 0 1 2.25 2.25v1.5" />
    </svg>
  );
}

function SpoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <ellipse cx="12" cy="7.5" rx="4" ry="4.5" />
      <path d="M12 12v8.25" />
    </svg>
  );
}

function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3.75 2.47 5.1 5.53.8-4 3.95.94 5.65L12 16.65l-4.94 2.6.94-5.65-4-3.95 5.53-.8L12 3.75Z" />
    </svg>
  );
}

function ExitIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M13.5 4.5H6.75A1.5 1.5 0 0 0 5.25 6v12a1.5 1.5 0 0 0 1.5 1.5H13.5" />
      <path d="M16.5 15.75 20.25 12l-3.75-3.75M9.75 12h10.5" />
    </svg>
  );
}

function paletteFor(trophy: Trophy): { icon: React.ReactNode; classes: string } {
  switch (trophy.kind) {
    case "champion":
      return { icon: <TrophyIcon className="h-6 w-6" />, classes: "bg-warn/15 text-warn" };
    case "wooden-spoon":
      return { icon: <SpoonIcon className="h-6 w-6" />, classes: "bg-danger/15 text-danger" };
    case "gotm":
      return { icon: <StarIcon className="h-6 w-6" />, classes: "bg-accent/15 text-accent" };
    case "adjustment":
      return trophy.positive
        ? { icon: <StarIcon className="h-6 w-6" />, classes: "bg-accent/15 text-accent" }
        : { icon: <ExitIcon className="h-6 w-6" />, classes: "bg-danger/15 text-danger" };
  }
}

/** Every honour (and forfeit) a player's picked up — see lib/trophies.ts. */
export function TrophyCabinet({ trophies }: { trophies: Trophy[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Trophy Cabinet</p>
      {trophies.length === 0 ? (
        <p className="card text-center text-sm text-muted">No silverware yet — get some wins in.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {trophies.map((trophy, i) => {
            const { icon, classes } = paletteFor(trophy);
            return (
              <div key={i} className="card flex items-center gap-3 py-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${classes}`}>{icon}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{trophy.title}</span>
                  <span className="block text-xs text-muted">{trophy.subtitle}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
