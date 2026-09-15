"use client";

import { useMemo, useState } from "react";
import { useLeads, useUpdateLead } from "@/hooks/use-leads";
import { Button } from "@/components/ui/button";
import { EMPTY_STATES, MEETING_ACTIONS, MEETINGS_CALENDAR } from "@/lib/constants";
import type { Lead } from "@/types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** YYYY-MM-DD in the browser's local time -- matters right at midnight, where
 *  a UTC-based key would put a meeting on the wrong day. */
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * One meeting's row inside a day cell, with Done/Cancel quick actions so a
 * rep can close it out right here instead of navigating to Pipeline. Both
 * just PATCH pipeline_stage via the existing useUpdateLead hook.
 */
function MeetingEntry({ lead }: { lead: Lead }) {
  const update = useUpdateLead();

  function markDone() {
    if (!confirm(MEETING_ACTIONS.doneConfirm(lead.company_name))) return;
    update.mutate({ id: lead.id, input: { pipeline_stage: "proposal_sent" } });
  }
  function cancelMeeting() {
    if (!confirm(MEETING_ACTIONS.cancelConfirm(lead.company_name))) return;
    update.mutate({ id: lead.id, input: { pipeline_stage: "lost" } });
  }

  return (
    <div className="group/meeting flex items-center justify-between gap-1">
      <p className="min-w-0 flex-1 truncate text-[0.72rem]" title={lead.company_name}>
        <span className="font-medium">{lead.company_name}</span>
        {" · "}
        {new Date(lead.meeting_at).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
      <div className="flex shrink-0 gap-0.5 opacity-0 group-hover/meeting:opacity-100">
        <button
          type="button"
          title={MEETING_ACTIONS.done}
          onClick={markDone}
          disabled={update.isPending}
          className="cursor-pointer text-[0.7rem] text-success"
        >
          {MEETING_ACTIONS.done}
        </button>
        <button
          type="button"
          title={MEETING_ACTIONS.cancel}
          onClick={cancelMeeting}
          disabled={update.isPending}
          className="cursor-pointer text-[0.7rem] text-danger"
        >
          {MEETING_ACTIONS.cancel}
        </button>
      </div>
    </div>
  );
}

/**
 * Month-grid view of every booked meeting. Editing a meeting's time still
 * happens from the Pipeline lead card (components/pipeline/pipeline-view.tsx
 * ManageDeal); closing one out (Done/Cancel) can happen right here.
 */
export function MeetingsCalendar({ initialLeads }: { initialLeads: Lead[] }) {
  const { data: allLeads = [] } = useLeads({ stage: "meeting_booked" }, initialLeads);
  // A lead can reach meeting_booked without a time (e.g. dragged there
  // directly via the Pipeline stage dropdown) -- those simply don't render
  // on the grid, which is correct: there is nowhere to put them.
  const meetings = useMemo(() => allLeads.filter((l) => l.meeting_at), [allLeads]);

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, Lead[]>();
    for (const lead of meetings) {
      const key = lead.meeting_at.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), lead]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.meeting_at.localeCompare(b.meeting_at));
    }
    return map;
  }, [meetings]);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Plain {year, month} pair, not a Date -- incrementing a Date's month
  // directly rolls over unpredictably near month-end (e.g. Jan 31 + 1 month).
  const cells = useMemo(() => {
    const firstOfMonth = new Date(cursor.year, cursor.month, 1);
    const startWeekday = firstOfMonth.getDay();
    const start = new Date(cursor.year, cursor.month, 1 - startWeekday);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const monthMeetingCount = useMemo(
    () =>
      meetings.filter((l) => {
        const d = new Date(l.meeting_at);
        return d.getFullYear() === cursor.year && d.getMonth() === cursor.month;
      }).length,
    [meetings, cursor],
  );

  function prevMonth() {
    setExpanded(null);
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  }
  function nextMonth() {
    setExpanded(null);
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));
  }
  function goToday() {
    setExpanded(null);
    const d = new Date();
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[1.1rem] font-semibold">{monthLabel}</h3>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={prevMonth}>
            {MEETINGS_CALENDAR.prevMonth}
          </Button>
          <Button variant="secondary" size="sm" onClick={goToday}>
            {MEETINGS_CALENDAR.today}
          </Button>
          <Button variant="secondary" size="sm" onClick={nextMonth}>
            {MEETINGS_CALENDAR.nextMonth}
          </Button>
        </div>
      </div>

      {monthMeetingCount === 0 ? (
        <p
          className="rounded-[8px] px-3 py-2 text-[0.9rem]"
          style={{ background: "var(--info-tint)", color: "var(--info)" }}
        >
          {EMPTY_STATES.meetings(monthLabel)}
        </p>
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-border">
          <div className="grid grid-cols-7">
            {WEEKDAY_LABELS.map((w) => (
              <div
                key={w}
                className="border-b border-border bg-tag px-2 py-1.5 text-center text-[0.72rem] font-semibold uppercase tracking-wide text-muted"
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d) => {
              const key = dateKey(d);
              const inMonth = d.getMonth() === cursor.month;
              const dayMeetings = byDay.get(key) ?? [];
              const isExpanded = expanded === key;
              const visible = isExpanded ? dayMeetings : dayMeetings.slice(0, 2);
              const hiddenCount = dayMeetings.length - visible.length;
              return (
                <div
                  key={key}
                  className="min-h-[100px] border-b border-r border-border p-1.5 last:border-r-0"
                  style={{ opacity: inMonth ? 1 : 0.45 }}
                >
                  <p className="mb-1 text-[0.75rem] text-muted">{d.getDate()}</p>
                  <div className="flex flex-col gap-0.5">
                    {visible.map((lead) => (
                      <MeetingEntry key={lead.id} lead={lead} />
                    ))}
                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpanded(key)}
                        className="cursor-pointer text-left text-[0.7rem] text-accent underline"
                      >
                        {MEETINGS_CALENDAR.moreCount(hiddenCount)}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
