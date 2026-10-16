"use client";

import { useState } from "react";
import {
  useCheckFollowupAttempt,
  useUncheckFollowupAttempt,
  useSetFollowupDue,
} from "@/hooks/use-leads";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Ico } from "@/components/ui/emoji-icon";
import { addedAt } from "@/lib/format";
import { FOLLOWUP_TRACKER, TOASTS } from "@/lib/constants";
import type { Lead } from "@/types";

type Context = "email_followup" | "call_followup";

function fields(lead: Lead, context: Context): { attempts: string[]; dueAt: string } {
  return context === "email_followup"
    ? { attempts: lead.email_followup_attempts, dueAt: lead.email_followup_due_at }
    : { attempts: lead.call_followup_attempts, dueAt: lead.call_followup_due_at };
}

// due_at is a naive PKT wall-clock string (no "Z" -- same convention as callback_at/meeting_at: the rep
// picked a date/time, never converted either way, see schemas/lead.py _dt()). Comparing it against the
// VIEWER's own Date.now() directly would silently use the viewer's local timezone instead of Pakistan's
// -- same bug class lib/format.ts's salesDayBounds()/weekBounds() already guard against. Appending "Z"
// makes its numeric fields read as PKT wall-clock while labelled UTC; shifting Date.now() by the same
// offset puts "now" in that same numeric space, so a plain <= comparison is valid regardless of which
// timezone the viewer's own machine is set to. Mirrors crud/attempt_reminders.py's own
// `now_pkt = _utcnow() + _PKT_OFFSET` comparison exactly.
const PKT_OFFSET_MS = 5 * 3600_000;

function nowAsPktWallMs(): number {
  return Date.now() + PKT_OFFSET_MS;
}

function dueAsPktWallMs(dueAt: string): number {
  return new Date(`${dueAt}Z`).getTime();
}

/** due + 1h has passed with nothing recorded since -- same threshold crud/attempt_reminders.py's
 * check_and_fire_proposal_followups() escalates on. Drives both this tracker's own red due-label and the
 * whole card's accent in pipeline-view.tsx (PipelineSummary computes the same thing for BOTH contexts). */
export function isFollowupEscalated(dueAt: string): boolean {
  if (!dueAt) return false;
  return nowAsPktWallMs() - dueAsPktWallMs(dueAt) >= 60 * 60 * 1000;
}

function isFollowupDue(dueAt: string): boolean {
  return Boolean(dueAt) && dueAsPktWallMs(dueAt) <= nowAsPktWallMs();
}

/**
 * Proposal Sent's Email/Call Attempt trackers (user, 2026-10-16, worked example + hand-drawn sketch,
 * confirmed ADDITIVE to the existing generic AttemptTracker "proposal" context, not a replacement --
 * "woh bhi rahega... yeh system us follow up attempt k neechy he ayega"). Open-ended: 3 slots shown by
 * default, a "+" reveals more (no hard cap, no 3rd-attempt Not Interested prompt here -- that stays on
 * the generic tracker above this one).
 *
 * The one thing that makes this different from every other attempt tracker in the app: the NEXT attempt's
 * due date/time is NOT auto-computed. Checking a box does not schedule anything by itself -- the rep picks
 * the next one's date/time explicitly via the icon under the next open slot ("mene kaha k me isko 22 ko 8
 * bajy email krunga, yeh reminder set ho gaya"). Reminder behaviour (crud/attempt_reminders.py
 * check_and_fire_proposal_followups()): the person who set it is pinged the moment it's due; if still
 * unchecked an hour later, the whole team is notified and the card turns red (isFollowupEscalated above).
 */
export function FollowupTracker({ lead, context }: { lead: Lead; context: Context }) {
  const check = useCheckFollowupAttempt();
  const uncheck = useUncheckFollowupAttempt();
  const setDue = useSetFollowupDue();
  const toast = useToast();

  const { attempts, dueAt } = fields(lead, context);
  const pending = check.isPending || uncheck.isPending || setDue.isPending;

  // Revealed slot count: starts at max(3, however many are already done -- e.g. loaded from a lead that
  // already has 5), grows only via "+" (never shrinks, never auto-grows from checking -- see isFollowupEscalated
  // doc comment above for why this shape avoids an empty slot reappearing right after one is filled).
  const [revealed, setRevealed] = useState(() => Math.max(3, attempts.length));

  const [schedulingIndex, setSchedulingIndex] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  function onCheck() {
    check.mutate(
      { id: lead.id, context },
      { onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed) },
    );
  }

  function onUncheck() {
    uncheck.mutate(
      { id: lead.id, context },
      { onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed) },
    );
  }

  function confirmDue() {
    if (!date || !time) return;
    setDue.mutate(
      { id: lead.id, context, dueAt: `${date}T${time}:00` },
      {
        onSuccess: () => {
          setSchedulingIndex(null);
          setDate("");
          setTime("");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
      },
    );
  }

  const escalated = isFollowupEscalated(dueAt);
  const due = isFollowupDue(dueAt);

  return (
    <div className="flex flex-col gap-1.5 rounded-[8px] border border-border bg-input px-3 py-2">
      <p className="text-[0.8rem] font-semibold">{FOLLOWUP_TRACKER.label[context]}</p>

      {/* All checkboxes in one row, consistent height -- fixed 2026-10-16 (user, screenshot: "UI thori
          behtr krny ki need hai"): the schedule icon used to sit stacked UNDER just the next checkbox,
          making that one slot taller than the rest and reading as broken. It's now a single row below,
          not per-checkbox. */}
      <div className="flex flex-wrap items-center gap-3">
        {Array.from({ length: revealed }, (_, i) => {
          const checked = i < attempts.length;
          const canCheck = i === attempts.length;
          const canUncheck = checked && i === attempts.length - 1;
          return (
            <label
              key={i}
              className={`flex items-center gap-1 text-[0.78rem] ${
                canCheck || canUncheck ? "cursor-pointer" : "cursor-default text-muted"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={pending || !(canCheck || canUncheck)}
                onChange={() => (checked ? onUncheck() : onCheck())}
                className="accent-[var(--accent)]"
              />
              {FOLLOWUP_TRACKER.attemptLabel(i + 1)}
            </label>
          );
        })}
        <button
          type="button"
          onClick={() => setRevealed((n) => n + 1)}
          disabled={attempts.length < revealed}
          title={FOLLOWUP_TRACKER.addMoreTitle}
          className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-border text-[0.85rem] font-bold leading-none text-muted hover:border-accent hover:text-accent disabled:cursor-default disabled:opacity-30"
        >
          +
        </button>
      </div>

      {attempts.length < revealed && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setSchedulingIndex(attempts.length);
            setDate("");
            setTime("");
          }}
          className="flex w-fit cursor-pointer items-center gap-1.5 text-[0.75rem] text-muted hover:text-accent disabled:cursor-default"
        >
          <Ico e="🕒" /> {FOLLOWUP_TRACKER.scheduleTitle}
        </button>
      )}

      {dueAt && (
        <p
          className="text-[0.75rem]"
          style={{ color: escalated ? "var(--danger)" : due ? "var(--warn)" : "var(--muted)" }}
        >
          {FOLLOWUP_TRACKER.dueLabel(addedAt(dueAt))}
          {escalated && ` -- ${FOLLOWUP_TRACKER.escalatedSuffix}`}
        </p>
      )}

      {schedulingIndex !== null && (
        <div className="flex flex-col gap-2 rounded-[8px] border border-accent bg-card px-3 py-3">
          <p className="text-[0.82rem] font-semibold">{FOLLOWUP_TRACKER.scheduleTitle}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Time">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSchedulingIndex(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={setDue.isPending}
              disabled={!date || !time}
              onClick={confirmDue}
            >
              Confirm
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
