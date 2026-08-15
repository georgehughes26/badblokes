"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function Countdown({ target, label }: { target: string; label: string }) {
  const targetMs = new Date(target).getTime();
  // Server and the pre-hydration client render must produce identical
  // markup, so the very first paint can't depend on Date.now() at all —
  // only mount client-side and start ticking once hydration is done.
  const [mounted, setMounted] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    function tick() {
      setMounted(true);
      setRemaining(targetMs - Date.now());
    }
    // Deferred via setTimeout (not called directly in the effect body) so
    // the first update lands as a real, separate commit after mount.
    const kickoff = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(kickoff);
      clearInterval(interval);
    };
  }, [targetMs]);

  const urgent = mounted && remaining > 0 && remaining < 60 * 60 * 1000;

  return (
    <div className="text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p
        className={[
          "font-display mt-1 text-5xl font-bold tabular-nums sm:text-6xl",
          urgent ? "text-warn" : "text-accent",
        ].join(" ")}
      >
        {mounted ? formatRemaining(remaining) : " "}
      </p>
    </div>
  );
}
