"use client";

import { useRef, useState } from "react";
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
 * Cards stay put -- a rep drags the row by hand (mouse or touch) to see the
 * rest, same as the original hand-drawn sketch. An earlier version
 * auto-scrolled on a timer; user asked for that removed since it kept
 * moving cards out from under a click.
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
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = trackRef.current;
    if (!el) return;
    dragRef.current = { startX: e.clientX, startScrollLeft: el.scrollLeft };
    setDragging(true);
    el.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = trackRef.current;
    if (!el || !dragRef.current) return;
    el.scrollLeft = dragRef.current.startScrollLeft - (e.clientX - dragRef.current.startX);
  }
  function endDrag() {
    dragRef.current = null;
    setDragging(false);
  }

  return (
    <div>
      <p className="metric-label mb-2">{heading}</p>
      <div
        ref={trackRef}
        className="activity-scroll-row select-none gap-3 pb-1 pr-3"
        style={{ cursor: dragging ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
      >
        {ACTIVITY_SCROLLER.cards.map((c) => (
          <MiniStat key={c.key} label={c.label} color={c.color} value={window[c.key as keyof ActivityWindow]} />
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="flex w-[190px] shrink-0 flex-col justify-between rounded-[14px] px-5 py-4"
      style={{ background: color, color: "#fff" }}
    >
      <p className="text-[0.78rem] font-bold uppercase tracking-wide opacity-95">{label}</p>
      <p className="mt-2 font-mono text-[2.4rem] font-bold leading-none">{num(value)}</p>
    </div>
  );
}
