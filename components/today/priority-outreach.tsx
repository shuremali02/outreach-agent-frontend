"use client";

import { useFullLead, useLeads } from "@/hooks/use-leads";
import { LeadCard } from "@/components/leads/lead-card";
import { StageSelect } from "@/components/leads/stage-select";
import { LinkedInResearchPanel, HunterDecisionMakers, SiteScanPanel } from "@/components/enrichment";
import { MailtoButton } from "@/components/common/mailto-button";
import { Textarea } from "@/components/ui/input";
import { STAGE_LABELS } from "@/lib/constants";
import { currency, externalUrl, displayDomain, hasUsableEmail, telUrl } from "@/lib/format";
import type { Lead } from "@/types";
import { EMPTY_STATES } from "@/lib/constants";
import { CategoryLabel, Ico, withIcons } from "@/components/ui/emoji-icon";

/** The 5 most recent leads, matching app.py's "Priority Outreach Items". */
export function PriorityOutreachList({ initialLeads }: { initialLeads: Lead[] }) {
  const { data: leads = [] } = useLeads({}, initialLeads);
  const top = leads.slice(0, 5);

  if (top.length === 0) {
    return <p className="text-muted">{withIcons(EMPTY_STATES.coldCallQueue)}</p>;
  }

  return (
    <div>
      {top.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          summary={
            <span className="text-[0.95rem]">
              <strong>{lead.company_name}</strong>
              <span className="text-muted">
                {" "}
                — {currency(lead.deal_value)} · <CategoryLabel value={lead.industry_tag} /> (
                {STAGE_LABELS[lead.pipeline_stage]})
              </span>
            </span>
          }
        >
          <PriorityDetails lead={lead} />
        </LeadCard>
      ))}
    </div>
  );
}

/**
 * The expanded body of a Priority Outreach card. Its own component so the full lead (draft body) is
 * fetched only when the card is opened -- LeadCard unmounts its children while closed -- not for all five
 * cards on every Today load. See useFullLead().
 */
function PriorityDetails({ lead: listLead }: { lead: Lead }) {
  const { lead } = useFullLead(listLead);
  return (
    <div className="grid grid-cols-[3fr_1fr] gap-6">
      <div className="flex flex-col gap-3">
        <p className="text-[0.9rem]">
          <strong>Decision maker:</strong> {lead.contact_name || "—"}
          {lead.contact_role && <span className="text-muted"> · {lead.contact_role}</span>}
        </p>

        <p className="text-[0.85rem] text-muted">
          {hasUsableEmail(lead.contact_email) && <><Ico e="✉" /> {lead.contact_email} · </>}
          {lead.contact_phone && (
            // Dense one-line summary, not the main dialer -- links only
            // the first number (telUrl() already does this on its own
            // if there are several, comma-joined); full multi-number
            // Call/Copy list is on the Battlecard/Contacts/Meetings
            // detail views this card expands from.
            <>
              <a href={telUrl(lead.contact_phone)} className="text-accent underline">
                <Ico e="📞" /> {lead.contact_phone}
              </a>{" "}
              ·{" "}
            </>
          )}
          {lead.company_website && (
            <a
              href={externalUrl(lead.company_website)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline"
            >
              <Ico e="🌐" /> {displayDomain(lead.company_website)}
            </a>
          )}
        </p>

        <LinkedInResearchPanel lead={lead} />
        <HunterDecisionMakers lead={lead} />
        <SiteScanPanel lead={lead} />

        {lead.reason && (
          <div>
            <p className="metric-label">Fit Observation</p>
            <p className="text-[0.88rem]">{lead.reason}</p>
          </div>
        )}

        {lead.subject && (
          <div>
            <p className="metric-label">Subject</p>
            <p className="text-[0.88rem]">{lead.subject}</p>
          </div>
        )}

        {/* Discovery no longer writes an email draft (core-plan Phase 7);
            a lead only gets one once it reaches Follow-ups, so an empty
            body means "no draft yet", not an empty box to show. */}
        {lead.body && (
          <div>
            <p className="metric-label">Draft Body</p>
            <Textarea defaultValue={lead.body} rows={6} readOnly />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[0.78rem] text-muted">
          Current stage: {STAGE_LABELS[lead.pipeline_stage]}
        </p>
        <StageSelect leadId={lead.id} value={lead.pipeline_stage} companyName={lead.company_name} />
        <MailtoButton
          email={lead.contact_email}
          subject={lead.subject}
          body={lead.body}
          block
        />
      </div>
    </div>
  );
}
