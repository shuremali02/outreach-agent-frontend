"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { ACTIVITY_SCROLLER } from "@/lib/constants";
import { num } from "@/lib/format";
import type { ActivityMetrics } from "@/types";

type Tone = "success" | "warn" | "info" | "danger" | "accent";

/**
 * Replaces the Google-Sheet-backed SalesFloorTicker on the Today page with
 * one bar of big, high-contrast colorful stat cards, read live from
 * call_events (see app/crud/call_events.py) instead of the manually-updated
 * sheet -- which has no per-day rows at all, so it could never answer "how
 * many calls today." Cards are solid semantic-color blocks (styles/tokens.css
 * --success/--warn/--info/--danger/--accent + white text) rather than the
 * app's usual pale tint-background badges -- deliberately bolder, since
 * these are meant to read at a glance, not blend in as a small inline label.
 */
export function ActivityScroller({ data }: { data: ActivityMetrics }) {
  return (
    <Card accent="accent" className="mb-4">
      <Row
        heading={ACTIVITY_SCROLLER.todayHeading}
        cards={[
          { label: ACTIVITY_SCROLLER.today.calls, value: data.today.calls, tone: "info" },
          { label: ACTIVITY_SCROLLER.today.connected, value: data.today.connected, tone: "success" },
          { label: ACTIVITY_SCROLLER.today.emails, value: data.today.emails, tone: "accent" },
          { label: ACTIVITY_SCROLLER.today.leadsAdded, value: data.today.leads_added, tone: "warn" },
        ]}
      />
      <div className="mt-3">
        <Row
          heading={ACTIVITY_SCROLLER.thisWeekHeading}
          cards={[
            { label: ACTIVITY_SCROLLER.thisWeek.followups, value: data.this_week.followups, tone: "warn" },
            { label: ACTIVITY_SCROLLER.thisWeek.meetings, value: data.this_week.meetings, tone: "success" },
            { label: ACTIVITY_SCROLLER.thisWeek.disconnected, value: data.this_week.disconnected, tone: "danger" },
            { label: ACTIVITY_SCROLLER.thisWeek.voicemail, value: data.this_week.voicemail, tone: "accent" },
            { label: ACTIVITY_SCROLLER.thisWeek.receptionist, value: data.this_week.receptionist, tone: "info" },
            { label: ACTIVITY_SCROLLER.thisWeek.decisionMaker, value: data.this_week.decision_maker, tone: "success" },
          ]}
        />
      </div>
    </Card>
  );
}

function Row({
  heading,
  cards,
}: {
  heading: string;
  cards: { label: string; value: number; tone: Tone }[];
}) {
  // Click-and-drag horizontal scroll -- a desktop mouse (no trackpad/wheel-
  // shift) has no other way to move this strip. cursor-grab/-grabbing gives
  // the visual cue that dragging is what scrolls it.
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef({ startX: 0, startScrollLeft: 0 });

  function onMouseDown(e: React.MouseEvent) {
    const el = trackRef.current;
    if (!el) return;
    setDragging(true);
    dragState.current = { startX: e.clientX, startScrollLeft: el.scrollLeft };
  }
  function onMouseMove(e: React.MouseEvent) {
    const el = trackRef.current;
    if (!dragging || !el) return;
    el.scrollLeft = dragState.current.startScrollLeft - (e.clientX - dragState.current.startX);
  }
  function endDrag() {
    setDragging(false);
  }

  return (
    <div>
      <p className="metric-label mb-2">{heading}</p>
      <div
        ref={trackRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        className={`flex gap-3 overflow-x-auto pb-1 select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        {cards.map((c) => (
          <MiniStat key={c.label} {...c} />
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div
      className="flex w-[190px] shrink-0 flex-col justify-between rounded-[14px] px-5 py-4"
      style={{ background: `var(--${tone})`, color: "#fff" }}
    >
      <p className="text-[0.78rem] font-bold uppercase tracking-wide opacity-95">{label}</p>
      <p className="mt-2 font-mono text-[2.4rem] font-bold leading-none">{num(value)}</p>
    </div>
  );
}
