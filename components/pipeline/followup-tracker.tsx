"use client";

import { useState } from "react";
import {
  useScheduleSlot,
  useMarkSlotAttempted,
  useUnmarkSlotAttempted,
} from "@/hooks/use-leads";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Ico } from "@/components/ui/emoji-icon";
import { addedAt } from "@/lib/format";
import { FOLLOWUP_TRACKER, TOASTS } from "@/lib/constants";
import { useUsers, useUserNames } from "@/hooks/use-users";
import type { FollowupSlot, Lead } from "@/types";

export type FollowupContext =
  | "email_followup"
  | "call_followup"
  | "callback"
  | "no_show_email_followup"
  | "no_show_call_followup";

function fields(lead: Lead, context: FollowupContext): FollowupSlot[] {
  switch (context) {
    case "email_followup":
      return lead.email_followup_slots;
    case "call_followup":
      return lead.call_followup_slots;
    case "callback":
      return lead.callback_slots;
    case "no_show_email_followup":
      return lead.no_show_email_followup_slots;
    case "no_show_call_followup":
      return lead.no_show_call_followup_slots;
  }
}

// scheduled_at is a naive PKT wall-clock string (no "Z" -- same convention as callback_at/meeting_at: the
// rep picked a date/time, never converted either way, see schemas/lead.py _dt()). Comparing it against the
// VIEWER's own Date.now() directly would silently use the viewer's local timezone instead of Pakistan's --
// same bug class lib/format.ts's salesDayBounds()/weekBounds() already guard against. Appending "Z" makes
// its numeric fields read as PKT wall-clock while labelled UTC; shifting Date.now() by the same offset
// puts "now" in that same numeric space, so a plain <= comparison is valid regardless of which timezone
// the viewer's own machine is set to. Mirrors crud/attempt_reminders.py's own
// `now_pkt = _utcnow() + _PKT_OFFSET` comparison exactly.
const PKT_OFFSET_MS = 5 * 3600_000;

function nowAsPktWallMs(): number {
  return Date.now() + PKT_OFFSET_MS;
}

function scheduledAsPktWallMs(scheduledAt: string): number {
  return new Date(`${scheduledAt}Z`).getTime();
}

function slotStatus(slot: FollowupSlot): "empty" | "done" | "escalated" | "due" | "upcoming" {
  if (!slot.scheduled_at) return "empty";
  if (slot.done_at) return "done";
  const now = nowAsPktWallMs();
  const scheduled = scheduledAsPktWallMs(slot.scheduled_at);
  if (now - scheduled >= 60 * 60 * 1000) return "escalated";
  if (now >= scheduled) return "due";
  return "upcoming";
}

/** Whole-card red state (user, 2026-10-16: "woh red ho jaye lead ... 1 ghnty bad") -- ANY slot in this
 * context is escalated (1h past its scheduled time, still not marked attempted). Drives
 * pipeline-view.tsx's card-level accent -- call once per context and OR the results together. */
export function isFollowupEscalated(slots: FollowupSlot[]): boolean {
  return slots.some((s) => slotStatus(s) === "escalated");
}

const STATUS_COLOR: Record<string, string> = {
  done: "var(--muted)",
  escalated: "var(--danger)",
  due: "var(--warn)",
  upcoming: "var(--muted)",
};

/**
 * Proposal Sent's Email/Call Attempt trackers, and (2026-10-16) Pipeline's Callback attempt tracker.
 * REDESIGNED from the original single-shared-due-date version after a live bug + correction: "mene check
 * mark kya toh woh time gayab ho gaya" / "hum ye mark kr dyn k is is date ko is bandy ko reminder kr wana
 * hai" -- the checkboxes were never meant to auto-clear on check. Each numbered slot (hand-drawn sketch:
 * "01 Attempt Set [icon] / 19-10-2026 8:30 AM / MARK ATTEMPTED") is fully independent: a rep can schedule
 * several dates up front (Monday / Thursday / next Monday, in any order), and marking one attempted NEVER
 * erases its date -- it stays visible permanently as a record.
 *
 * `hideMarkAttempted` (user: "mark resolve wale check phir proposal mark par na dikhayen yeh sahi hoga
 * taky confusion na ho") -- the Proposal Send gate (proposal-reminder-prompt.tsx) shows ONLY scheduling,
 * no "Mark Attempted" action, since nothing has happened yet at that point.
 */
export function FollowupTracker({
  lead,
  context,
  hideMarkAttempted = false,
}: {
  lead: Lead;
  context: FollowupContext;
  hideMarkAttempted?: boolean;
}) {
  const scheduleSlot = useScheduleSlot();
  const markAttempted = useMarkSlotAttempted();
  const unmarkAttempted = useUnmarkSlotAttempted();
  const toast = useToast();
  const { data: users } = useUsers();
  const userName = useUserNames();

  const slots = fields(lead, context);
  const pending = scheduleSlot.isPending || markAttempted.isPending || unmarkAttempted.isPending;

  // 3 slots shown by default (matches the sketch), "+" reveals more -- independent of how many already
  // have data, never shrinks.
  const [extraRevealed, setExtraRevealed] = useState(0);
  const visibleCount = Math.max(3, slots.length) + extraRevealed;

  const [schedulingIndex, setSchedulingIndex] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  // "" = just me (no assignment), "team" = whole team, else a stringified user id (2026-10-19, user:
  // "bilal bhai ali bhai ko assign bhi krdyn... woh reminder k mere sath sath ammar ko bhi woh remindr
  // jaye") -- an ADDITIONAL recipient on top of whoever scheduled it.
  const [assignTo, setAssignTo] = useState("");

  function openSchedule(index: number, existing: FollowupSlot | undefined) {
    setSchedulingIndex(index);
    if (existing?.scheduled_at) {
      const [d, t] = existing.scheduled_at.split("T");
      setDate(d ?? "");
      setTime((t ?? "").slice(0, 5));
    } else {
      setDate("");
      setTime("");
    }
    setAssignTo(existing?.assigned_to_team ? "team" : existing?.assigned_to_user_id ? String(existing.assigned_to_user_id) : "");
  }

  function confirmSchedule() {
    if (schedulingIndex === null || !date || !time) return;
    scheduleSlot.mutate(
      {
        id: lead.id,
        context,
        index: schedulingIndex,
        scheduledAt: `${date}T${time}:00`,
        assignedToTeam: assignTo === "team",
        assignedToUserId: assignTo && assignTo !== "team" ? Number(assignTo) : null,
      },
      {
        onSuccess: () => setSchedulingIndex(null),
        onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
      },
    );
  }

  function toggleAttempted(index: number, done: boolean) {
    const mutation = done ? unmarkAttempted : markAttempted;
    mutation.mutate(
      { id: lead.id, context, index },
      { onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed) },
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-[8px] border border-border bg-input px-3 py-2">
      <p className="text-[0.8rem] font-semibold">{FOLLOWUP_TRACKER.label[context]}</p>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: visibleCount }, (_, i) => {
          const slot = slots[i];
          const status = slot ? slotStatus(slot) : "empty";
          return (
            <div key={i} className="flex min-w-[9rem] flex-col gap-1 rounded-[6px] border border-border px-2 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.78rem] font-semibold">
                  {FOLLOWUP_TRACKER.attemptLabel(i + 1)}
                  {status === "done" && " ✓"}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => openSchedule(i, slot)}
                  title={FOLLOWUP_TRACKER.scheduleTitle}
                  className="cursor-pointer text-muted hover:text-accent disabled:cursor-default"
                >
                  <Ico e="🕒" />
                </button>
              </div>
              {slot?.scheduled_at && (
                <p className="text-[0.72rem]" style={{ color: STATUS_COLOR[status] }}>
                  {addedAt(slot.scheduled_at)}
                  {status === "escalated" && ` -- ${FOLLOWUP_TRACKER.escalatedSuffix}`}
                </p>
              )}
              {slot?.scheduled_at && (slot.assigned_to_team || slot.assigned_to_user_id) && (
                <p className="text-[0.72rem] text-muted">
                  {FOLLOWUP_TRACKER.assignedTag(
                    slot.assigned_to_team ? FOLLOWUP_TRACKER.assignWholeTeam : userName(slot.assigned_to_user_id),
                  )}
                </p>
              )}
              {slot?.scheduled_at && !hideMarkAttempted && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => toggleAttempted(i, status === "done")}
                  className="cursor-pointer text-left text-[0.72rem] font-semibold text-accent underline disabled:cursor-default"
                >
                  {status === "done" ? FOLLOWUP_TRACKER.unmarkAttempted : FOLLOWUP_TRACKER.markAttempted}
                </button>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setExtraRevealed((n) => n + 1)}
          title={FOLLOWUP_TRACKER.addMoreTitle}
          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center self-start rounded-full border border-border text-[0.85rem] font-bold leading-none text-muted hover:border-accent hover:text-accent"
        >
          +
        </button>
      </div>

      {schedulingIndex !== null && (
        <div className="flex flex-col gap-2 rounded-[8px] border border-accent bg-card px-3 py-3">
          <p className="text-[0.82rem] font-semibold">{FOLLOWUP_TRACKER.scheduleTitle} -- {FOLLOWUP_TRACKER.attemptLabel(schedulingIndex + 1)}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Time">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          <Field label={FOLLOWUP_TRACKER.assignLabel}>
            <Select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
              <option value="">{FOLLOWUP_TRACKER.assignJustMe}</option>
              <option value="team">{FOLLOWUP_TRACKER.assignWholeTeam}</option>
              {(users ?? []).map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.name || u.email.split("@")[0]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSchedulingIndex(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={scheduleSlot.isPending}
              disabled={!date || !time}
              onClick={confirmSchedule}
            >
              Confirm
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
