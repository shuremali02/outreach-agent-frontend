"use client";

import { useMemo, useState } from "react";
import { useLeads, useUpdateLead } from "@/hooks/use-leads";
import { LeadCard } from "@/components/leads/lead-card";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/input";
import { MailtoButton } from "@/components/common/mailto-button";
import { DISPOSITIONS, FOLLOWUP_STAGES, STAGE_LABELS } from "@/lib/constants";
import { hasUsableEmail } from "@/lib/format";
import type { Lead } from "@/types";
import { EMPTY_STATES, LEAD_CARD } from "@/lib/constants";

/** outcome -> button label ("🟡 Voicemail"), reused so the filter and the
 * badge on each card read exactly the same word the rep clicked. */
const OUTCOME_LABELS: Record<string, string> = Object.fromEntries(
  DISPOSITIONS.map((d) => [d.outcome, d.label]),
);
const ALL_REASONS = "All Reasons";

/** The pre-composed 2nd-touch draft from app.py, with the calendar link inlined. */
function secondTouch(lead: Lead, calendarLink: string): string {
  const first = (lead.contact_name || "there").split(" ")[0];
  return `Hi ${first},

Following up on my note about a 3D configurator for ${lead.company_name}.

Most of the builders we work with were in the same spot — buyers imagining custom options from static photos, then going quiet before requesting a quote. An interactive configurator closes that gap.

Worth a quick 15 minutes? ${calendarLink}

Best,
Bilal
Elipse Studio`;
}

function FollowUpCard({ lead, calendarLink }: { lead: Lead; calendarLink: string }) {
  const update = useUpdateLead();
  const [draft, setDraft] = useState(() => secondTouch(lead, calendarLink));

  return (
    <LeadCard
      summary={
        <span className="text-[0.95rem]">
          ⏰ <strong>{lead.company_name}</strong>
          <span className="text-muted">
            {" "}
            — Next Step for {lead.contact_name || "this account"} (
            {STAGE_LABELS[lead.pipeline_stage]}
            {lead.last_call_outcome ? ` · ${OUTCOME_LABELS[lead.last_call_outcome] ?? lead.last_call_outcome}` : ""}
            )
          </span>
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        {hasUsableEmail(lead.contact_email) && (
          <p className="text-[0.85rem] text-muted">✉️ {lead.contact_email}</p>
        )}
        {lead.subject && (
          <p className="text-[0.85rem] text-muted">
            <strong>{LEAD_CARD.followUpSubject}</strong> {lead.subject}
          </p>
        )}

        {lead.notes && (
          <div>
            <h4 className="mb-1 text-[1rem] font-semibold">📝 Notes</h4>
            <p className="whitespace-pre-line rounded-[8px] bg-input px-3 py-2 text-[0.85rem]">
              {lead.notes}
            </p>
          </div>
        )}

        <div>
          <h4 className="mb-1 text-[1rem] font-semibold">⚡ Quick Follow-up Draft</h4>
          <Textarea rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MailtoButton
            email={lead.contact_email}
            subject={`Re: ${lead.subject}`}
            body={draft}
            label="📧 Send Follow-up (1-Click)"
            block
          />
          <Button
            variant="primary"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({ id: lead.id, input: { pipeline_stage: "meeting_booked" } })
            }
          >
            ✅ Mark as Meeting Booked
          </Button>
        </div>
      </div>
    </LeadCard>
  );
}

export function FollowUpList({
  initialLeads,
  calendarLink,
}: {
  initialLeads: Lead[];
  calendarLink: string;
}) {
  const { data: allLeads = [] } = useLeads({}, initialLeads);
  const stageLeads = allLeads.filter((l) => FOLLOWUP_STAGES.includes(l.pipeline_stage));

  // Reason filter: pipeline_stage alone can't say WHY a lead landed here --
  // voicemail, callback_scheduled and receptionist all collapse to the same
  // "followup_due" stage. Only offer reasons actually present, so the
  // dropdown doesn't show options that would just empty the list.
  const [reason, setReason] = useState(ALL_REASONS);
  const presentReasons = useMemo(
    () => DISPOSITIONS.filter((d) => stageLeads.some((l) => l.last_call_outcome === d.outcome)),
    [stageLeads],
  );
  const leads = useMemo(
    () => stageLeads.filter((l) => reason === ALL_REASONS || l.last_call_outcome === reason),
    [stageLeads, reason],
  );

  if (stageLeads.length === 0) {
    return (
      <p className="rounded-[8px] px-3 py-2 text-[0.9rem]" style={{ background: "var(--info-tint)", color: "var(--info)" }}>
        {EMPTY_STATES.followUps}
      </p>
    );
  }

  return (
    <>
      {presentReasons.length > 1 && (
        <Field label="Reason Filter" className="mb-4 max-w-xs">
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value={ALL_REASONS}>{ALL_REASONS}</option>
            {presentReasons.map((d) => (
              <option key={d.outcome} value={d.outcome}>
                {d.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {leads.map((lead) => (
        <FollowUpCard key={lead.id} lead={lead} calendarLink={calendarLink} />
      ))}
    </>
  );
}
