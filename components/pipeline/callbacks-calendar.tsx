"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CallbackDetailDialog } from "./callback-detail-dialog";
import { EMPTY_STATES, MEETINGS_CALENDAR } from "@/lib/constants";
import type { Lead } from "@/types";
import { withIcons } from "@/components/ui/emoji-icon";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-is-mobile";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Month-grid calendar of callback-scheduled leads, keyed off `callback_at` instead of `meeting_at` --
 * same day-cell/month-navigation mechanics as components/meetings/meetings-calendar.tsx (a separate copy
 * rather than a shared generalized component, deliberately, to ship this first version with zero risk to
 * the Meetings page -- can be unified later once this is confirmed wanted).
 *
 * User, Slack (Bilal Lania): "Can we add calendar here [Callbacks]?... so people know how many they have
 * to do on that particular day". Takes the SAME already-filtered `leads` array pipeline-view.tsx's List/
 * Grid views use (no separate fetch), so Category/Country/Source/view filters all apply here too.
 */
/** YYYY-MM-DD for a calendar GRID CELL (a local Date built from plain year/month/day, see `cells`
 *  below) -- local Y/M/D extraction, NOT .toISOString() (which converts to UTC and can shift the date
 *  by a day depending on the browser's own offset). Same function meetings-calendar.tsx uses. */
function cellKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

function CallbackEntry({ lead, isToday }: { lead: Lead; isToday: boolean }) {
  return (
    <CallbackDetailDialog
      lead={lead}
      trigger={
        <button
          type="button"
          className={cn(
            "flex w-full min-w-0 flex-col items-start gap-0.5 text-left hover:underline text-[clamp(0.72rem,0.7vw,0.8rem)]",
            isToday && "rounded-[6px] px-1.5 py-1 font-semibold no-underline",
          )}
          style={isToday ? { background: "var(--success-tint)" } : undefined}
          title={lead.company_name}
        >
          <span className="min-w-0 max-w-full truncate font-medium">{lead.company_name}</span>
          <span className="shrink-0 text-muted">
            {new Date(lead.callback_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        </button>
      }
    />
  );
}

export function CallbacksCalendar({ leads }: { leads: Lead[] }) {
  // Phone: one entry per day, the rest behind "+N more" (user, 2026-11-11). Desktop still shows 2.
  const perDay = useIsMobile() ? 1 : 2;
  const callbacks = useMemo(() => leads.filter((l) => l.callback_at), [leads]);

  const [cursor, setCursor] = useState(() => todayInPKT());
  const [expanded, setExpanded] = useState<string | null>(null);
  const todayKey = todayKeyPKT();

  const byDay = useMemo(() => {
    const map = new Map<string, Lead[]>();
    for (const lead of callbacks) {
      // callback_at is a naive wall-clock string (see app/schemas/lead.py's _dt(), not _dt_utc()) --
      // .slice(0, 10) reads its date straight off the string, no Date/timezone conversion involved.
      const key = lead.callback_at.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), lead]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.callback_at.localeCompare(b.callback_at));
    }
    return map;
  }, [callbacks]);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

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

  const monthCount = useMemo(
    () =>
      callbacks.filter((l) => {
        const d = new Date(l.callback_at);
        return d.getFullYear() === cursor.year && d.getMonth() === cursor.month;
      }).length,
    [callbacks, cursor],
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

      {monthCount === 0 ? (
        <p
          className="rounded-[8px] px-3 py-2 text-[0.9rem]"
          style={{ background: "var(--info-tint)", color: "var(--info)" }}
        >
          {withIcons(EMPTY_STATES.callbacks)}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[12px] border border-border">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-7">
              {WEEKDAY_LABELS.map((w) => (
                <div
                  key={w}
                  className="border-b border-border bg-tag text-center font-semibold uppercase tracking-wide text-muted px-[clamp(6px,0.6vw,12px)] py-[clamp(4px,0.3vw,7px)] text-[clamp(0.68rem,0.7vw,0.78rem)]"
                >
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((d) => {
                const key = cellKey(d);
                const inMonth = d.getMonth() === cursor.month;
                const isToday = key === todayKey;
                const dayCallbacks = byDay.get(key) ?? [];
                const isExpanded = expanded === key;
                const visible = isExpanded ? dayCallbacks : dayCallbacks.slice(0, perDay);
                const hiddenCount = dayCallbacks.length - visible.length;
                return (
                  <div
                    key={key}
                    className="border-b border-r border-border last:border-r-0 min-h-[clamp(80px,5vw,112px)] p-[clamp(4px,0.35vw,8px)]"
                    style={{
                      opacity: inMonth ? 1 : 0.45,
                      backgroundColor: isToday
                        ? "var(--success-tint)"
                        : dayCallbacks.length > 0
                          ? "var(--warn-tint)"
                          : undefined,
                      boxShadow: isToday ? "inset 0 0 0 2px var(--success-strong)" : undefined,
                    }}
                    title={isToday ? "Today (PKT)" : undefined}
                  >
                    <p className="mb-1 flex items-center justify-between gap-1 text-muted text-[clamp(0.75rem,0.75vw,0.85rem)]">
                      <span>{d.getDate()}</span>
                      {dayCallbacks.length > 0 && (
                        <span className="rounded-[4px] bg-input px-1 text-[0.65rem] font-semibold text-text">
                          {dayCallbacks.length}
                        </span>
                      )}
                    </p>
                    <div className="flex flex-col gap-[clamp(2px,0.15vw,4px)]">
                      {visible.map((lead) => (
                        <CallbackEntry key={lead.id} lead={lead} isToday={isToday} />
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
