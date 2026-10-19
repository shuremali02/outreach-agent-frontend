"use client";

import { FollowupTracker } from "@/components/pipeline/followup-tracker";
import { Button } from "@/components/ui/button";
import { withIcons } from "@/components/ui/emoji-icon";
import { PROPOSAL_REMINDER_PROMPT } from "@/lib/constants";
import type { Lead } from "@/types";

/**
 * Blocking gate shown wherever a lead can be marked Proposal Send (user, 2026-10-16: "jese he purposal
 * send button click hon whn pehle woh reminder set ka puche... jab tk banda set na kry time tb tk agy
 * nhi jayegi lead pipeline me" -- confirmed for BOTH Cold Call/LinkedIn Desk's disposition AND Pipeline/
 * Meeting's quick action). Confirm stays disabled until at least one channel has a due date.
 *
 * Reuses the EXACT same FollowupTracker UI the Pipeline card shows after the fact (fixed 2026-10-16,
 * three times: a channel dropdown couldn't express "both" -- "agar mujhy dono krna ho jese kal meeting me
 * ek ny kaha tha 2 din bad email bhej dena or week bad call kr na"; then a simplified date-field form was
 * replaced with the real tracker UI itself -- "wese he rkhdo na jese mene dekhai thi"; then the per-slot
 * redesign after the "check mark kya toh time gayab ho gaya" bug). `hideMarkAttempted` -- "mark resolve
 * wale check phir proposal mark par na dikhayen" -- nothing has happened yet at gate time, so only
 * scheduling shows here, never the Mark Attempted action.
 *
 * crud/followup_slots.py's schedule_slot() has no pipeline_stage guard, so FollowupTracker works
 * correctly on a lead that isn't Proposal Sent yet -- the icon schedules a slot exactly as it would
 * afterward; `scheduled` below just reads it straight off the (reactively updating, via React Query's
 * cache after each mutation) `lead` prop, no separate tracking needed.
 */
export function ProposalReminderPrompt({
  lead,
  onConfirm,
  onCancel,
  pending,
}: {
  lead: Lead;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
}) {
  const scheduled =
    lead.email_followup_slots.some((s) => s.scheduled_at) || lead.call_followup_slots.some((s) => s.scheduled_at);

  return (
    <div className="flex flex-col gap-2 rounded-[8px] border border-accent bg-input px-3 py-3">
      <p className="text-[0.85rem] font-semibold">{withIcons(PROPOSAL_REMINDER_PROMPT.title)}</p>
      <FollowupTracker lead={lead} context="email_followup" hideMarkAttempted />
      <FollowupTracker lead={lead} context="call_followup" hideMarkAttempted />
      <p className="text-[0.72rem] text-muted">{PROPOSAL_REMINDER_PROMPT.hint}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          {withIcons(PROPOSAL_REMINDER_PROMPT.cancel)}
        </Button>
        <Button variant="primary" size="sm" loading={pending} disabled={!scheduled} onClick={onConfirm}>
          {withIcons(PROPOSAL_REMINDER_PROMPT.confirm)}
        </Button>
      </div>
    </div>
  );
}
