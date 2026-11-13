"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { metricsApi } from "@/lib/api";
import { MyStatsGrid } from "@/components/team/my-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/hooks/use-is-admin";
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
export function ActivityScroller() {
  // Fetched by the browser so the backend knows who is asking (admin = whole team's numbers, rep = their own).
  const { data } = useQuery({
    queryKey: ["activity-metrics"],
    queryFn: metricsApi.activity,
    refetchInterval: 60_000,
    // Refresh on coming back to the tab / opening the page too (2026-11-13), not only every 60 s: someone who just
    // booked a meeting then looks at Today sees it at once. Cheap -- the backend answers from a cache that every
    // write clears (app/services/stats_cache.py).
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
  const isAdmin = useIsAdmin();
  if (!data) {
    // While the numbers load: card-shaped placeholders (a rep gets two cards, an admin one).
    return (
      <>
        {(isAdmin ? [0] : [0, 1]).map((i) => (
          <Card key={i} accent="accent" className="mb-4">
            <Skeleton className="mb-3 h-3 w-20" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-20 rounded-[12px]" />
              ))}
            </div>
          </Card>
        ))}
      </>
    );
  }
  if (!isAdmin) return <MyActivity data={data} />;
  return <ActivityScrollerView data={data} />;
}

/** A rep's own Today / This-Week numbers as tiles (the draggable card row is for the admin's team totals). */
function MyActivity({ data }: { data: ActivityMetrics }) {
  // Two separate cards, same design (user, 2026-11-13: "today or this week alag alag rkhyn").
  return (
    <>
      <Card accent="accent" className="mb-4">
        <p className="metric-label !mb-3">{ACTIVITY_SCROLLER.todayHeading}</p>
        <MyStatsGrid stats={data.today} />
      </Card>
      <Card accent="accent" className="mb-4">
        <p className="metric-label !mb-3">{ACTIVITY_SCROLLER.thisWeekHeading}</p>
        <MyStatsGrid stats={data.this_week} />
      </Card>
    </>
  );
}

function ActivityScrollerView({ data }: { data: ActivityMetrics }) {
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
