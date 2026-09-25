"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { TeamTable } from "@/components/team/team-table";
import { Field, Select } from "@/components/ui/input";
import { metricsApi } from "@/lib/api";
import { DISPOSITIONS, STAGE_LABELS, TEAM_ACTIVITY } from "@/lib/constants";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUsers } from "@/hooks/use-users";
import type { ActivityFeedItem, PipelineStage, TeamWeeks } from "@/types";
import { stripEmoji, withIcons } from "@/components/ui/emoji-icon";

/** A "month" here is a block of 4 weeks (not a calendar month) -- see WeeklyReport below. */
const WEEKS_PER_BLOCK = 4;

const OUTCOME_LABELS: Record<string, string> = Object.fromEntries(DISPOSITIONS.map((d) => [d.outcome, d.label]));

function describe(item: ActivityFeedItem): string {
  if (item.event_type === "call_outcome") return OUTCOME_LABELS[item.outcome ?? ""] ?? item.outcome ?? "Call";
  if (item.event_type === "email_sent") return TEAM_ACTIVITY.event.email_sent;
  if (item.event_type === "note_added") return TEAM_ACTIVITY.event.note_added;
  if (item.event_type === "stage_change") {
    return TEAM_ACTIVITY.event.stage_change(STAGE_LABELS[item.outcome as PipelineStage] ?? item.outcome ?? "");
  }
  return item.event_type;
}

function fmtRange(start: string, end: string): string {
  const f = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${f(start)} to ${f(end)}`;
}

/** Recent Activity: who did what, newest first, optionally one person. */
function ActivityFeed() {
  const [person, setPerson] = useState<string>("all");
  const { data: users = [] } = useUsers();
  const userId = person === "all" ? null : Number(person);
  const { data: feed = [] } = useQuery({
    queryKey: ["team-feed", userId],
    queryFn: () => metricsApi.teamFeed(userId, 100),
    refetchInterval: 60_000,
  });

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[1.2rem] font-semibold">{withIcons(TEAM_ACTIVITY.feedHeading)}</h2>
        <Field label={TEAM_ACTIVITY.feedFilter} className="w-56">
          <Select value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="all">{stripEmoji(TEAM_ACTIVITY.allPeople)}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {stripEmoji(u.name || u.email)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {feed.length === 0 ? (
        <p className="text-[0.9rem] text-muted">{withIcons(TEAM_ACTIVITY.feedEmpty)}</p>
      ) : (
        <ul className="overflow-hidden rounded-[10px] border border-border bg-card">
          {feed.map((i) => (
            <li key={i.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-border px-4 py-2.5 last:border-0">
              <span className="w-[150px] shrink-0 text-[0.8rem] tabular-nums text-muted">
                {new Date(i.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
              <span className={cn("w-[140px] shrink-0 font-semibold", i.user_id === null && "italic text-muted")}>
                {i.user_name}
              </span>
              <span className="min-w-0 flex-1 text-[0.92rem]">
                {describe(i)} <span className="text-muted">·</span> <strong>{i.company_name}</strong>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Sales Terminal -> Weekly Report: Week 1, Week 2, ... (Week 1 starts on the configured Monday, PKT),
 * a row per person for the chosen week, how the team's calls moved vs the week before, and the
 * Recent Activity feed underneath.
 */
export function WeeklyReport({ initialData }: { initialData: TeamWeeks }) {
  const { data = initialData } = useQuery({
    queryKey: ["team-weeks"],
    queryFn: metricsApi.teamWeeks,
    initialData,
    refetchInterval: 60_000,
  });
  const [picked, setPicked] = useState<number | null>(null);

  if (!data.started) {
    return (
      <>
        <p className="rounded-[8px] px-3 py-2 text-[0.9rem]" style={{ background: "var(--info-tint)", color: "var(--info)" }}>
          {withIcons(TEAM_ACTIVITY.weekNotStarted(fmtRange(data.week1_start, data.week1_start).split(" to ")[0]))}
        </p>
        <ActivityFeed />
      </>
    );
  }

  // data.weeks is newest-first, numbered continuously from Week 1 (the backend's wire format, unchanged).
  // `picked` null = follow the current (newest) week, so when a new week starts it becomes the one on
  // screen by itself; a specific number = the rep stepped back to that week.
  //
  // Weeks are grouped into 4-week "months" (user, 2026-09-24, chose "4-week blocks": "yeh 4 weeks tk he rhyga
  // kyun k 4 weeks bad toh month he end ho jata hai") -- NOT calendar months (Week 1 = Sep 21, so block 1
  // ends Oct 18). The heading shows the week's number WITHIN its block (Week 5 overall = Week 1 of Month
  // 2), ‹ › step only inside the selected block, and the Month switch below jumps between blocks.
  const blockOf = (n: number) => Math.floor((n - 1) / WEEKS_PER_BLOCK);
  const idx = Math.max(0, data.weeks.findIndex((w) => w.week === picked)); // -1 (null) -> newest
  const week = data.weeks[idx];
  const currentBlock = blockOf(data.weeks[0].week);
  const selBlock = week ? blockOf(week.week) : currentBlock;
  const blockWeeks = data.weeks.filter((w) => blockOf(w.week) === selBlock); // still newest-first
  const bIdx = week ? blockWeeks.findIndex((w) => w.week === week.week) : 0;
  const olderWeek = blockWeeks[bIdx + 1];
  const newerWeek = blockWeeks[bIdx - 1];
  const blocks = [...new Set(data.weeks.map((w) => blockOf(w.week)))]
    .sort((a, b) => a - b)
    .map((index) => {
      const ws = data.weeks.filter((w) => blockOf(w.week) === index);
      return { index, newest: ws[0], start: ws[ws.length - 1].start, end: ws[0].end };
    });
  const go = (target: number) => setPicked(target === data.weeks[0].week ? null : target);
  const arrow =
    "cursor-pointer rounded-[6px] p-1 text-muted transition-colors hover:text-accent disabled:cursor-default disabled:opacity-30 disabled:hover:text-muted";

  return (
    <>
      {blocks.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {blocks.map((b) => (
            <button
              key={b.index}
              type="button"
              onClick={() => go(b.newest.week)}
              title={fmtRange(b.start, b.end)}
              className={cn(
                "cursor-pointer rounded-[8px] border px-3 py-1.5 text-[0.85rem] font-semibold transition-colors",
                b.index === selBlock
                  ? "border-transparent bg-accent text-white"
                  : "border-border bg-card text-muted hover:border-accent hover:text-accent",
              )}
            >
              Month {b.index + 1}
              {b.index === currentBlock && " •"}
            </button>
          ))}
        </div>
      )}

      {week && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => olderWeek && go(olderWeek.week)}
                disabled={!olderWeek}
                aria-label="Previous week"
                title="Previous week"
                className={arrow}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => newerWeek && go(newerWeek.week)}
                disabled={!newerWeek}
                aria-label="Next week"
                title="Next week"
                className={arrow}
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <h2 className="text-[1.3rem] font-semibold">
              Week {((week.week - 1) % WEEKS_PER_BLOCK) + 1}{" "}
              <span className="text-[1rem] font-normal text-muted">{fmtRange(week.start, week.end)}</span>
            </h2>
            {week.in_progress && (
              <span className="rounded-full bg-info-tint px-2 py-0.5 text-[0.75rem] font-semibold text-info" style={{ background: "var(--info-tint)", color: "var(--info)" }}>
                {withIcons(TEAM_ACTIVITY.inProgress)}
              </span>
            )}
            <span className="text-[0.9rem] text-muted">
              {num(week.total.calls)} {TEAM_ACTIVITY.columns.calls.toLowerCase()}
              {week.calls_change !== null && ` · ${TEAM_ACTIVITY.callsChange(week.calls_change)}`}
            </span>
          </div>
          <TeamTable rows={week.rows} total={week.total} />
        </>
      )}

      {data.before_tracking && (
        <p className="mt-3 text-[0.82rem] text-muted">
          {TEAM_ACTIVITY.beforeTracking}: {num(data.before_tracking.calls)} {TEAM_ACTIVITY.columns.calls.toLowerCase()},{" "}
          {num(data.before_tracking.emails)} {TEAM_ACTIVITY.columns.emails.toLowerCase()}, {num(data.before_tracking.leads_added)}{" "}
          {TEAM_ACTIVITY.columns.leads_added.toLowerCase()}.
        </p>
      )}

      <ActivityFeed />
    </>
  );
}
