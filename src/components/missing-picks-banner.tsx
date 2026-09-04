import { getMissingPickerNames } from "@/lib/picks";

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} AND ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} AND ${names[names.length - 1]}`;
}

/** Shared possession attaches only to the last name — "Matthew Parsons and Jack's teams", not "Matthew Parsons's and Jack's". */
function possessiveList(names: string[]): string {
  const last = names[names.length - 1];
  const suffix = last.endsWith("S") ? "'" : "'S";
  return `${joinNames(names)}${suffix}`;
}

/**
 * The "has anyone seen X's team?!" callout for whoever hasn't picked yet.
 * Renders nothing once everyone's in — the caller (see app/page.tsx) only
 * ever mounts this during the LOCKED-but-before-kick-off window, so it
 * naturally appears the moment picks close and disappears at kick-off.
 */
export async function MissingPicksBanner({ gameweekId }: { gameweekId: string }) {
  const missing = await getMissingPickerNames(gameweekId);
  if (missing.length === 0) return null;

  const names = missing.map((n) => n.toUpperCase());

  return (
    <div className="card flex items-center gap-4 border-danger/50 bg-danger/5 py-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/cundy.jpg"
        alt="Furious talkSPORT-style reaction"
        className="h-20 w-16 shrink-0 rounded-lg border-2 border-danger object-cover shadow-[0_4px_16px_-4px_rgba(0,0,0,0.6)]"
      />
      <div className="min-w-0">
        <p className="font-display text-lg leading-tight font-bold text-danger sm:text-xl">
          HAAAAAAAAAS ANYONE SEEN {possessiveList(names)} TEAM{missing.length > 1 ? "S" : ""}?!
        </p>
        <p className="font-display mt-1 text-base leading-tight font-bold text-foreground sm:text-lg">
          CAN YOU ERRRRRRRRR ME {joinNames(names)}?!
        </p>
      </div>
    </div>
  );
}
