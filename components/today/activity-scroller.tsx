import { Card } from "@/components/ui/card";
import { ACTIVITY_SCROLLER } from "@/lib/constants";
import { num } from "@/lib/format";
import type { ActivityMetrics, ActivityWindow } from "@/types";

/**
 * Replaces the Google-Sheet-backed SalesFloorTicker on the Today page with
 * one bar of big, high-contrast colorful stat cards, read live from
 * call_events (see app/crud/call_events.py) instead of the manually-updated
 * sheet -- which has no per-day rows at all, so it could never answer "how
 * many calls today." Both rows show the SAME 10 cards (ACTIVITY_SCROLLER.cards)
 * -- only the numbers differ (today's window vs this week's), never the set
 * of metrics. Each card gets its own fixed, high-contrast color (not a
 * shared theme token -- there aren't 10 of those) so all 10 read as visually
 * distinct at a glance.
 *
 * Auto-scrolls slowly (.activity-marquee in globals.css), pausing on hover
 * so a rep can actually read or click a card instead of chasing it.
 */
export function ActivityScroller({ data }: { data: ActivityMetrics }) {
  return (
    <Card accent="accent" className="mb-4">
      <Row heading={ACTIVITY_SCROLLER.todayHeading} window={data.today} />
      <div className="mt-3">
        <Row heading={ACTIVITY_SCROLLER.thisWeekHeading} window={data.this_week} />
      </div>
    </Card>
  );
}

function Row({ heading, window }: { heading: string; window: ActivityWindow }) {
  return (
    <div>
      <p className="metric-label mb-2">{heading}</p>
      <div className="activity-marquee">
        <div className="activity-marquee-track gap-3 pb-1 pr-3">
          {ACTIVITY_SCROLLER.cards.map((c) => (
            <MiniStat key={c.key} label={c.label} color={c.color} value={window[c.key as keyof ActivityWindow]} />
          ))}
          {/* Exact duplicate, hidden from assistive tech, so the flat list of
              20 items is exactly 2x one set's width -- -50% loops seamlessly. */}
          {ACTIVITY_SCROLLER.cards.map((c) => (
            <MiniStat
              key={`dup-${c.key}`}
              label={c.label}
              color={c.color}
              value={window[c.key as keyof ActivityWindow]}
              hidden
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
  hidden = false,
}: {
  label: string;
  value: number;
  color: string;
  /** True for the marquee's duplicate set -- kept out of assistive tech. */
  hidden?: boolean;
}) {
  return (
    <div
      aria-hidden={hidden}
      className="flex w-[190px] shrink-0 flex-col justify-between rounded-[14px] px-5 py-4"
      style={{ background: color, color: "#fff" }}
    >
      <p className="text-[0.78rem] font-bold uppercase tracking-wide opacity-95">{label}</p>
      <p className="mt-2 font-mono text-[2.4rem] font-bold leading-none">{num(value)}</p>
    </div>
  );
}
