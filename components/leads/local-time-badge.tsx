"use client";

import { useNow } from "@/hooks/use-now";
import { CALL_WINDOW } from "@/lib/constants";
import { localClock } from "@/lib/format";

/**
 * "🟢 9:12 AM · Chicago" while that lead is inside local business hours, "🌙
 * 5:41 AM · Chicago" outside them ("🌙 Sat 5:41 AM ..." on a weekend there).
 * A lead WITH a number but no known timezone (toll-free, a multi-zone area
 * code) gets a muted "Local time unknown" pill instead of nothing, so a rep
 * can tell "no zone" from "badge missing". No number at all: nothing.
 */
export function LocalTimeBadge({ tz, hasPhone }: { tz: string; hasPhone: boolean }) {
  // A ticking clock: the time used to be read once per render, so a page left open showed stale times.
  const now = useNow();
  if (now === null) return null;
  const clock = localClock(tz, new Date(now), CALL_WINDOW.startHour, CALL_WINDOW.endHour);
  if (!clock) {
    if (!hasPhone) return null;
    return (
      <span
        className="terminal-pill"
        style={{ background: "var(--tag)", color: "var(--muted)" }}
        title="This number has no single timezone (toll-free or a multi-zone area code)"
      >
        🕘 Local time unknown
      </span>
    );
  }
  const spec = clock.open
    ? { icon: "🟢", bg: "var(--success-tint)", fg: "var(--success)" }
    : { icon: "🌙", bg: "var(--tag)", fg: "var(--muted)" };
  return (
    <span
      className="terminal-pill"
      style={{ background: spec.bg, color: spec.fg }}
      title={clock.open ? "Inside local business hours" : "Outside local business hours"}
    >
      {spec.icon} {clock.weekend ? `${clock.weekend} ` : ""}
      {clock.time} · {clock.city}
    </span>
  );
}
