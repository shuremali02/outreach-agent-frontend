"use client";

import { FollowupTracker } from "@/components/pipeline/followup-tracker";
import { Button } from "@/components/ui/button";
import { withIcons } from "@/components/ui/emoji-icon";
import { NO_SHOW_REMINDER_PROMPT } from "@/lib/constants";
import type { Lead } from "@/types";

/**
 * No Show's version of ProposalReminderPrompt (user, 2026-10-19: "humny jo system proposal button pr
 * lgaya hai same woh no show pr bhi lagega... call attempts bhi or email attempts bhi no show pr dono
 * reminder laga skyn") -- identical mechanism, separate contexts (no_show_email_followup/
 * no_show_call_followup) so these reminders never conflate with Proposal Sent's.
 */
export function NoShowReminderPrompt({
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
    lead.no_show_email_followup_slots.some((s) => s.scheduled_at) ||
    lead.no_show_call_followup_slots.some((s) => s.scheduled_at);

  return (
    <div className="flex flex-col gap-2 rounded-[8px] border border-accent bg-input px-3 py-3">
      <p className="text-[0.85rem] font-semibold">{withIcons(NO_SHOW_REMINDER_PROMPT.title)}</p>
      <FollowupTracker lead={lead} context="no_show_email_followup" hideMarkAttempted />
      <FollowupTracker lead={lead} context="no_show_call_followup" hideMarkAttempted />
      <p className="text-[0.72rem] text-muted">{NO_SHOW_REMINDER_PROMPT.hint}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          {withIcons(NO_SHOW_REMINDER_PROMPT.cancel)}
        </Button>
        <Button variant="primary" size="sm" loading={pending} disabled={!scheduled} onClick={onConfirm}>
          {withIcons(NO_SHOW_REMINDER_PROMPT.confirm)}
        </Button>
      </div>
    </div>
  );
}
