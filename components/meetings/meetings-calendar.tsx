"use client";

import { useMemo, useState } from "react";
import { useLeads } from "@/hooks/use-leads";
import { Button } from "@/components/ui/button";
import { MeetingDetailDialog } from "./meeting-detail-dialog";
import { EMPTY_STATES, MEETINGS_CALENDAR, STAGE_LABELS } from "@/lib/constants";
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

/** Background/text pair for the stage pill on each calendar entry -- meeting_booked
 *  (still awaiting an outcome) deliberately reuses the same amber the day cell
 *  itself already uses, so "not yet decided" reads consistently; the other four
 *  are the same win/loss/followup/proposal colors used elsewhere in the app
 *  (Button's !text-success/!text-danger, follow-up list, etc). */
const _STAGE_PILL: Record<Lead["pipeline_stage"], { bg: string; fg: string }> = {
  new_lead: { bg: "var(--tag)", fg: "var(--muted)" },
  draft_ready: { bg: "var(--tag)", fg: "var(--muted)" },
  contacted: { bg: "var(--tag)", fg: "var(--muted)" },
  followup_due: { bg: "var(--info-tint)", fg: "var(--info)" },
  meeting_booked: { bg: "var(--warn-tint)", fg: "var(--warn)" },
  proposal_sent: { bg: "var(--info-tint)", fg: "var(--info)" },
  won: { bg: "var(--success-tint)", fg: "var(--success)" },
  lost: { bg: "var(--danger-tint)", fg: "var(--danger)" },
};

/**
 * One meeting's row inside a day cell -- opens the detail popup, which now
 * carries the outcome-picker actions too (moved there 2026-09-18: cluttered
 * this row and "didn't look good" per the user, especially with several
 * meetings stacked in one cell). Meetings now persist on the calendar past
 * meeting_booked (see MeetingsCalendar below), so the current stage is shown
 * as a small pill right on the entry -- confirmed live 2026-09-18, the user
 * wants the stage visible on the card itself, not just discoverable by
 * opening the popup.
 */
function MeetingEntry({ lead }: { lead: Lead }) {
  const pill = _STAGE_PILL[lead.pipeline_stage];
  return (
    <MeetingDetailDialog
      lead={lead}
      trigger={
        <button
          type="button"
          className="flex w-full min-w-0 flex-col items-start gap-0.5 text-left text-[0.72rem] hover:underline"
          title={lead.company_name}
        >
          <span className="min-w-0 max-w-full truncate">
            <span className="font-medium">{lead.company_name}</span>
            {" · "}
            {new Date(lead.meeting_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
          <span
            className="rounded-[4px] px-1 py-[1px] text-[0.62rem] font-medium leading-tight no-underline"
            style={{ background: pill.bg, color: pill.fg }}
          >
            {STAGE_LABELS[lead.pipeline_stage]}
          </span>
        </button>
      }
    />
  );
}

/**
 * Month-grid view of every meeting ever booked, regardless of current
 * pipeline_stage. Editing a meeting's time still happens from the Pipeline
 * lead card (components/pipeline/pipeline-view.tsx ManageDeal); picking an
 * outcome (Client Closed / Not Interested / Follow-up / Proposal Sent) can
 * happen right here, and no longer removes the meeting from the grid --
 * confirmed live 2026-09-18: marking a meeting "Done" used to move it out of
 * meeting_booked and make it vanish from the calendar entirely, which the
 * user explicitly does not want ("chali gai jani nhi chhiye na"). The
 * calendar is a record of every meeting that happened, not just the ones
 * still awaiting an outcome, so this no longer filters by stage at all --
 * only by meeting_at being set.
 */
export function MeetingsCalendar({ initialLeads }: { initialLeads: Lead[] }) {
  const { data: allLeads = [] } = useLeads({}, initialLeads);
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
                  style={{
                    opacity: inMonth ? 1 : 0.45,
                    backgroundColor: dayMeetings.length > 0 ? "var(--warn-tint)" : undefined,
                  }}
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
