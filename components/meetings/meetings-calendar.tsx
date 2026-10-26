"use client";

import { useMemo, useState } from "react";
import { useLeads } from "@/hooks/use-leads";
import { useNow } from "@/hooks/use-now";
import { Button } from "@/components/ui/button";
import { MeetingDetailDialog } from "./meeting-detail-dialog";
import { EMPTY_STATES, MEETINGS_CALENDAR, STAGE_LABELS } from "@/lib/constants";
import type { Lead } from "@/types";
import { Ico, withIcons } from "@/components/ui/emoji-icon";
import { cn } from "@/lib/utils";

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
 * "YYYY-MM-DD" / {year, month, day} for right now, in Asia/Karachi (PKT, fixed UTC+5, no DST) -- NOT the
 * viewer's own browser timezone (user, 2026-10-06: "date hum PKT standard se he rakhenge Karachi timezone
 * ke hisaab se"). Drives both which month the calendar opens to and which cell gets the "today" dot below
 * -- a rep in a different timezone must still see Karachi's today, not their own.
 */
function todayKeyPKT(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function todayInPKT(): { year: number; month: number } {
  const [y, m] = todayKeyPKT().split("-").map(Number);
  return { year: y, month: m - 1 };
}

/** Background/text pair for the stage pill on each calendar entry -- meeting_booked
 *  (still awaiting an outcome) deliberately reuses the same amber the day cell
 *  itself already uses, so "not yet decided" reads consistently; the other four
 *  are the same win/loss/followup/proposal colors used elsewhere in the app
 *  (Button's !text-success/!text-danger, follow-up list, etc).
 *  followup_due got its OWN violet (2026-10-23, user: "follow up or purposal sent in dono stages ka
 *  color same dikhta hai ... ek ek ko prhna prhta hai") -- it used to share --info with proposal_sent,
 *  which read as identical at this pill's small size; see styles/tokens.css --followup. */
const _STAGE_PILL: Record<Lead["pipeline_stage"], { bg: string; fg: string }> = {
  new_lead: { bg: "var(--tag)", fg: "var(--muted)" },
  draft_ready: { bg: "var(--tag)", fg: "var(--muted)" },
  contacted: { bg: "var(--tag)", fg: "var(--muted)" },
  followup_due: { bg: "var(--followup-tint)", fg: "var(--followup)" },
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
function MeetingEntry({ lead, isToday }: { lead: Lead; isToday?: boolean }) {
  const pill = _STAGE_PILL[lead.pipeline_stage];
  const now = useNow();
  // "Proposal Sent" leads whose meeting_at is still in the FUTURE only (2026-10-26, user correction: the
  // clock icon below was showing on every Proposal Sent entry, including old/past ones whose meeting_at
  // is just a stale leftover from the FIRST meeting that already happened -- "yeh to sab pr he dekhny ko
  // mil raha hai ... humein sirf un pr dekhna hai jin se dubara meeting schedule or active hain". A
  // Proposal Sent lead only has a meeting_at still ahead of "now" when a follow-up was actually booked
  // (see crud.book_followup_meeting()) -- the original meeting, once it happened, always has a
  // meeting_at in the past by the time the lead reaches this stage. `now === null` during SSR/hydration
  // (useNow()) deliberately keeps this false then, same safe pattern meeting-reminder-banner.tsx uses.
  const hasActiveFollowup =
    lead.pipeline_stage === "proposal_sent" && now !== null && new Date(lead.meeting_at).getTime() > now;
  return (
    <MeetingDetailDialog
      lead={lead}
      trigger={
        <button
          type="button"
          className={cn(
            "flex w-full min-w-0 flex-col items-start gap-0.5 text-left text-[0.72rem] hover:underline",
            // Today's own meeting(s) need to pop immediately, not just rely on the day cell's own light
            // tint (user, 2026-10-23: "card green hota hai but meeting pr koi effect nhi jis sy foran
            // eye catching ho"). A soft pulsing ring in the SAME green the cell already uses -- a static
            // accent-orange border/background was tried first and looked clashing against the green
            // ("ajeeb"), see the meeting-entry-pulse keyframes in globals.css for that correction.
            isToday && "meeting-entry-pulse rounded-[6px] px-1.5 py-1 font-semibold no-underline",
          )}
          style={isToday ? { background: "var(--success-tint)" } : undefined}
          title={lead.company_name}
        >
          <span className="min-w-0 max-w-full truncate">
            {hasActiveFollowup && (
              <>
                <Ico e="🕐" />{" "}
              </>
            )}
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
            {withIcons(STAGE_LABELS[lead.pipeline_stage])}
          </span>
        </button>
      }
    />
  );
}

/**
 * Month-grid view of every meeting ever booked, regardless of current
 * pipeline_stage. Editing a meeting's time now happens from Contacts (structure-plan.md Phase 4 moved
 * all lead editing there); picking an
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
  const { data: allLeads = [] } = useLeads({ includeMeetingHidden: true }, initialLeads);
  // A lead can reach meeting_booked without a time (e.g. dragged there
  // directly via the Pipeline stage dropdown) -- those simply don't render
  // on the grid, which is correct: there is nowhere to put them.
  const meetings = useMemo(() => allLeads.filter((l) => l.meeting_at), [allLeads]);

  const [cursor, setCursor] = useState(() => todayInPKT());
  const [expanded, setExpanded] = useState<string | null>(null);
  // Which cell gets the green "today" dot below -- PKT, same reasoning as todayInPKT() above.
  const todayKey = todayKeyPKT();

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
    setCursor(todayInPKT());
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
          {withIcons(EMPTY_STATES.meetings(monthLabel))}
        </p>
      ) : (
        // A calendar can't drop below 7 columns, so instead of stacking, this scrolls sideways on a
        // narrow phone -- same tradeoff components/team/team-table.tsx already makes for its own
        // too-wide-to-shrink-further content. min-w-[560px] keeps each cell at least 80px, never so
        // cramped a day number or meeting pill becomes unreadable.
        <div className="overflow-x-auto rounded-[12px] border border-border">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-7">
            {WEEKDAY_LABELS.map((w) => (
              <div
                key={w}
                className="border-b border-border bg-tag px-1.5 py-1 text-center text-[0.68rem] font-semibold uppercase tracking-wide text-muted sm:px-2 sm:py-1.5 sm:text-[0.72rem]"
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d) => {
              const key = dateKey(d);
              const inMonth = d.getMonth() === cursor.month;
              const isToday = key === todayKey;
              const dayMeetings = byDay.get(key) ?? [];
              const isExpanded = expanded === key;
              const visible = isExpanded ? dayMeetings : dayMeetings.slice(0, 2);
              const hiddenCount = dayMeetings.length - visible.length;
              return (
                <div
                  key={key}
                  className="min-h-[80px] border-b border-r border-border p-1 last:border-r-0 sm:min-h-[100px] sm:p-1.5"
                  style={{
                    opacity: inMonth ? 1 : 0.45,
                    // Today's whole card gets a light green highlight instead of just a small dot (user,
                    // 2026-10-21: "us card ko pura he highlight kr dya jaye toh zyada behtr hai light
                    // color sy") -- takes priority over the "has meetings" tint below, so today is always
                    // the most visible cell on the calendar regardless of whether it has meetings yet.
                    backgroundColor: isToday
                      ? "var(--success-tint)"
                      : dayMeetings.length > 0
                        ? "var(--warn-tint)"
                        : undefined,
                    boxShadow: isToday ? "inset 0 0 0 1px var(--success)" : undefined,
                  }}
                  title={isToday ? "Today (PKT)" : undefined}
                >
                  <p className="mb-1 text-[0.75rem] text-muted">{d.getDate()}</p>
                  <div className="flex flex-col gap-0.5">
                    {visible.map((lead) => (
                      <MeetingEntry key={lead.id} lead={lead} isToday={isToday} />
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
        </div>
      )}
    </div>
  );
}
