"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useLeads } from "@/hooks/use-leads";
import { EditLeadDialog } from "@/components/leads/edit-lead-dialog";
import { LeadCard } from "@/components/leads/lead-card";
import { LeadWho } from "@/components/leads/lead-who";
import { NotesPanel } from "@/components/leads/notes-panel";
import { PhoneNumberList } from "@/components/leads/phone-number-list";
import { Select, Field } from "@/components/ui/input";
import {
  COUNTRIES,
  LEAD_SOURCE_LABELS,
  STAGE_LABELS,
  STANDARD_CATEGORIES,
  ALL_CATEGORIES,
  ALL_COUNTRIES,
  ALL_SOURCES,
  UNKNOWN_COUNTRY,
  PROJECTS_VIEW,
  PIPELINE_CARD,
  countryLabel,
} from "@/lib/constants";
import { addedAt, currency, externalUrl, displayDomain, hasUsableEmail, leadSource } from "@/lib/format";
import type { Lead } from "@/types";
import { EMPTY_STATES } from "@/lib/constants";

/**
 * structure-plan.md Phase 7, narrowed 2026-09-22 (live-testing feedback -- "purposals sary hamary pass
 * pipline me he dekhny chahiye kahin or nhi"): used to combine both closed paths, Cold Call Desk's
 * Closed (proposal_sent) and Meeting's Client Closed (won). Proposal Sent now stays in Pipeline instead
 * (see components/pipeline/pipeline-view.tsx), so this is Won only. Full notes here (Phase 2/4's
 * "editing lives in Contacts" rule still applies to everything else -- deal value, phone, stage, etc).
 */
export function ProjectsView({
  initialLeads,
  category,
  country,
  q,
}: {
  initialLeads: Lead[];
  category: string;
  country: string;
  q: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // No `stage` param -- same reasoning as Pipeline (Phase 4): the backend's list_leads() only supports a
  // single exact-match stage filter, so this fetches unfiltered by stage and narrows client-side.
  const { data: fetchedLeads = [] } = useLeads({ category, country, q }, initialLeads);
  const [source, setSource] = useState(ALL_SOURCES);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all" && value !== ALL_CATEGORIES && value !== ALL_COUNTRIES) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const inScope = useMemo(() => fetchedLeads.filter((l) => l.pipeline_stage === "won"), [fetchedLeads]);
  const leads = useMemo(
    () => inScope.filter((l) => source === ALL_SOURCES || leadSource(l.source_prompt) === source),
    [inScope, source],
  );

  return (
    <>
      <div className="mb-4 grid grid-cols-3 gap-4">
        <Field label="Category Filter">
          <Select value={category} onChange={(e) => setParam("category", e.target.value)}>
            <option value={ALL_CATEGORIES}>{ALL_CATEGORIES}</option>
            {STANDARD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Country Filter">
          <Select value={country} onChange={(e) => setParam("country", e.target.value)}>
            <option value={ALL_COUNTRIES}>{ALL_COUNTRIES}</option>
            <option value={UNKNOWN_COUNTRY}>🏳️ Unknown</option>
            {COUNTRIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Source Filter">
          <Select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value={ALL_SOURCES}>{ALL_SOURCES}</option>
            {Object.entries(LEAD_SOURCE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {leads.length === 0 && <p className="text-muted">{EMPTY_STATES.projects}</p>}

      {leads.map((lead) => (
        <LeadCard
          key={lead.id}
          summary={
            <span className="text-[0.95rem]">
              <strong>{lead.company_name}</strong>
              <span className="ml-2 rounded-[6px] bg-input px-1.5 py-0.5 text-[0.75rem] font-semibold text-muted">
                {PROJECTS_VIEW.tag[lead.pipeline_stage] ?? STAGE_LABELS[lead.pipeline_stage]}
              </span>
              <span className="text-muted">
                {" "}
                — {currency(lead.deal_value)} · {lead.industry_tag}
              </span>
              <span className="ml-2 text-[0.75rem] text-muted">
                🕒 {addedAt(lead.created_at)} · {LEAD_SOURCE_LABELS[leadSource(lead.source_prompt)]}
                <LeadWho lead={lead} />
              </span>
            </span>
          }
        >
          <div className="grid grid-cols-[1.6fr_1fr] gap-6">
            <div className="flex flex-col gap-3">
              <h4 className="text-[1rem] font-semibold">🏢 Company &amp; Contact</h4>
              {lead.company_website && (
                <a
                  href={externalUrl(lead.company_website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.85rem] text-accent underline"
                >
                  🌐 {displayDomain(lead.company_website)}
                </a>
              )}
              <p className="text-[0.85rem]">👤 {lead.contact_name || "—"}</p>
              {hasUsableEmail(lead.contact_email) && (
                <p className="text-[1rem] font-medium text-text">✉️ {lead.contact_email}</p>
              )}
              {lead.contact_phone && <PhoneNumberList phones={lead.contact_phone} />}
              <p className="text-[0.82rem] text-muted">
                <strong>Country:</strong> {lead.country ? countryLabel(lead.country) : "Not specified"}
              </p>
              <EditLeadDialog
                lead={lead}
                trigger={
                  <button type="button" className="cursor-pointer text-left text-[0.85rem] font-semibold text-accent underline">
                    {PIPELINE_CARD.editInContacts}
                  </button>
                }
              />
            </div>

            <NotesPanel lead={lead} />
          </div>
        </LeadCard>
      ))}
    </>
  );
}
