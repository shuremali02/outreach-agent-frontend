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
 * twice: a channel dropdown couldn't express "both" -- "agar mujhy dono krna ho jese kal meeting me ek
 * ny kaha tha 2 din bad email bhej dena or week bad call kr na"; then the user asked to just keep the
 * ORIGINAL sketch's checkbox+icon+"+" design here too instead of a separate simplified date-field form --
 * "wese he rkhdo na jese mene dekhai thi... jese agar ek sy zyada lagana ho toh masla na ho". One UI,
 * reused before AND after the stage actually changes, so "more than one reminder" is never a special
 * case -- it's just the "+" button, same as it already is on Pipeline).
 *
 * crud/proposal_followups.py's set_due()/record_attempt() have no pipeline_stage guard, so FollowupTracker
 * works correctly on a lead that isn't Proposal Sent yet -- the icon schedules a due date exactly as it
 * would afterward; `scheduled` below just reads it straight off the (reactively updating, via React
 * Query's cache after each mutation) `lead` prop, no separate tracking needed.
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
  const scheduled = Boolean(lead.email_followup_due_at || lead.call_followup_due_at);

  return (
    <div className="flex flex-col gap-2 rounded-[8px] border border-accent bg-input px-3 py-3">
      <p className="text-[0.85rem] font-semibold">{withIcons(PROPOSAL_REMINDER_PROMPT.title)}</p>
      <FollowupTracker lead={lead} context="email_followup" />
      <FollowupTracker lead={lead} context="call_followup" />
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
