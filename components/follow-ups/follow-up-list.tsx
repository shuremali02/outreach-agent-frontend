"use client";

import { useState } from "react";
import { useLeads, useUpdateLead } from "@/hooks/use-leads";
import { LeadCard } from "@/components/leads/lead-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { MailtoButton } from "@/components/common/mailto-button";
import { FOLLOWUP_STAGES, STAGE_LABELS } from "@/lib/constants";
import { hasUsableEmail } from "@/lib/format";
import type { Lead } from "@/types";
import { EMPTY_STATES, LEAD_CARD } from "@/lib/constants";

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
            {STAGE_LABELS[lead.pipeline_stage]})
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
  const leads = allLeads.filter((l) => FOLLOWUP_STAGES.includes(l.pipeline_stage));

  if (leads.length === 0) {
    return (
      <p className="rounded-[8px] px-3 py-2 text-[0.9rem]" style={{ background: "var(--info-tint)", color: "var(--info)" }}>
        {EMPTY_STATES.followUps}
      </p>
    );
  }

  return (
    <>
      {leads.map((lead) => (
        <FollowUpCard key={lead.id} lead={lead} calendarLink={calendarLink} />
      ))}
    </>
  );
}
