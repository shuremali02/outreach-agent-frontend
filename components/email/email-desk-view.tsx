"use client";

import { useState } from "react";
import { useLeads, useMarkEmailDeskSent, useUnmarkEmailDeskSent } from "@/hooks/use-leads";
import { PipelineSummary } from "@/components/pipeline/pipeline-view";
import { LeadCard } from "@/components/leads/lead-card";
import { EditLeadDialog } from "@/components/leads/edit-lead-dialog";
import { NotesPanel } from "@/components/leads/notes-panel";
import { PhoneNumberList } from "@/components/leads/phone-number-list";
import { LinkedInResearchPanel, HunterDecisionMakers, SiteScanPanel } from "@/components/enrichment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Ico, CategoryLabel, CountryFlag, withIcons } from "@/components/ui/emoji-icon";
import { addedAt, externalUrl, displayDomain, hasUsableEmail } from "@/lib/format";
import { EMAIL_DESK } from "@/lib/constants";
import type { Lead } from "@/types";

/**
 * The manual Email desk (user, 2026-10-21, "smtp service abhi decide nhi konsi leni hai humyn" -- no
 * SMTP yet, everything here is tracked by hand). Same isolated-queue idea as Cold Call Desk/LinkedIn
 * Desk (see crud/leads.py desk="email"), but a much lighter view than ColdCallView -- no calling-specific
 * tickers, just a search box and a list.
 *
 * Each card reuses Pipeline's own body wholesale (<PipelineSummary>/<NotesPanel>, same 3-column layout
 * pipeline-view.tsx renders) rather than rebuilding it -- so any reminder/tracker/action button a lead is
 * already entitled to at its current stage shows up here too (user: "is me bhi woh reminder show hoga jo
 * humny bnaya tha email or call wala"), and pressing any existing disposition button (Meeting Booked /
 * Callback Scheduled / Not Interested / ...) already clears email_desk_sent_at via apply_call_outcome()'s
 * _LEAVES_DESK, so the lead leaves this page on its own -- no bespoke "Replied"/"Dead" buttons needed here.
 */
export function EmailDeskView({ initialLeads, q }: { initialLeads: Lead[]; q: string }) {
  const [search, setSearch] = useState(q);
  const { data: leads = [] } = useLeads({ q: search, slim: false, desk: "email" }, initialLeads);

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search company, contact, email…"
        className="max-w-sm"
      />
      {leads.length === 0 && <p className="text-muted">{withIcons(EMAIL_DESK.empty)}</p>}
      {leads.map((lead) => (
        <EmailDeskCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
}

function EmailDeskCard({ lead }: { lead: Lead }) {
  const toast = useToast();
  const markSent = useMarkEmailDeskSent();
  const unmarkSent = useUnmarkEmailDeskSent();
  const pending = markSent.isPending || unmarkSent.isPending;

  function toggleSent() {
    const mutation = lead.email_sent_at ? unmarkSent : markSent;
    mutation.mutate(lead.id, {
      onError: (e) => toast.error(e instanceof Error ? e.message : EMAIL_DESK.markSentFailed),
    });
  }

  return (
    <LeadCard
      key={lead.id}
      lead={lead}
      headerAction={
        <EditLeadDialog
          lead={lead}
          trigger={
            <button type="button" className="cursor-pointer text-[0.82rem] font-semibold text-accent underline">
              Edit in Leads
            </button>
          }
        />
      }
      summary={
        <span className="text-[0.95rem]">
          <Ico e="📧" /> <strong>{lead.company_name}</strong>
          {lead.outreach_email && <span className="text-muted"> — {lead.outreach_email}</span>}
          <span className="mt-1 flex flex-wrap items-center gap-1.5 sm:mt-0 sm:inline sm:gap-0">
            {lead.email_sent_at && (
              <span className="rounded-[6px] bg-input px-1.5 py-0.5 text-[0.75rem] font-semibold text-muted sm:ml-2">
                {withIcons(EMAIL_DESK.sentTag(addedAt(lead.email_sent_at)))}
              </span>
            )}
          </span>
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr_1.2fr]">
        <div className="flex flex-col gap-3">
          <h4 className="text-[1rem] font-semibold">
            <Ico e="🏢" /> Company &amp; Contact
          </h4>
          {lead.company_website && (
            <a
              href={externalUrl(lead.company_website)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.85rem] text-accent underline"
            >
              <Ico e="🌐" /> {displayDomain(lead.company_website)}
            </a>
          )}
          <p className="text-[0.85rem]">
            <Ico e="👤" /> {lead.contact_name || "—"}
          </p>
          {hasUsableEmail(lead.contact_email) && (
            <p className="text-[1rem] font-medium text-text">
              <Ico e="✉" /> {lead.contact_email}
            </p>
          )}
          {lead.contact_phone && <PhoneNumberList phones={lead.contact_phone} />}

          <LinkedInResearchPanel lead={lead} />
          <HunterDecisionMakers lead={lead} />
          <SiteScanPanel lead={lead} />

          <p className="text-[0.82rem] text-muted">
            <strong>Category:</strong> <CategoryLabel value={lead.industry_tag} />
          </p>
          <p className="text-[0.82rem] text-muted">
            <strong>Country:</strong> {lead.country ? <CountryFlag code={lead.country} /> : "Not specified"}
          </p>

          <Button variant="secondary" size="sm" loading={pending} onClick={toggleSent}>
            {withIcons(lead.email_sent_at ? EMAIL_DESK.unmarkSent : EMAIL_DESK.markSent)}
          </Button>
        </div>

        <PipelineSummary lead={lead} />

        <NotesPanel lead={lead} />
      </div>
    </LeadCard>
  );
}
