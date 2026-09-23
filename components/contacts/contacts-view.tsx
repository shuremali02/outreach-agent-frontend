"use client";

import { useMemo, useState } from "react";
import { useLeads, useSendToDesk } from "@/hooks/use-leads";
import { LeadCard } from "@/components/leads/lead-card";
import { LeadEditForm } from "@/components/leads/lead-edit-form";
import { LeadWho } from "@/components/leads/lead-who";
import { NotesPanel } from "@/components/leads/notes-panel";
import { PhoneNumberList } from "@/components/leads/phone-number-list";
// CategoryPills/CountryPills/SourcePills no longer used here -- this page's
// filters were converted to dropdowns to match Cold Call Desk/Pipeline (see
// docs.md). The components themselves are kept, unused, in case a pill-style
// filter is wanted again somewhere.
import { LinkedInResearchPanel, HunterDecisionMakers, SiteScanPanel } from "@/components/enrichment";
import { MetricCard } from "@/components/metrics/metric-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Select, Field } from "@/components/ui/input";
import {
  COUNTRIES,
  ALL_SOURCES,
  STAGE_LABELS,
  STANDARD_CATEGORIES,
  ALL_CATEGORIES,
  ALL_COUNTRIES,
  UNKNOWN_COUNTRY,
  LEAD_SOURCE_LABELS,
  SEND_TO_DESK,
  countryLabel,
} from "@/lib/constants";
import {
  addedAt,
  currency,
  externalUrl,
  displayDomain,
  hasUsableEmail,
  contactLabel,
  leadSource,
  isToday,
  isThisWeek,
} from "@/lib/format";
import type { Lead } from "@/types";
import { EMPTY_STATES } from "@/lib/constants";

/**
 * structure-plan.md Phase 2 -- Contacts is the only place a lead moves onto the Cold Call Desk from.
 * Always enabled (no phone/email gate, the rep decides); re-sending an already-sent lead just refreshes
 * the timestamp. Sits above the edit form so it reads as the primary action on this card.
 */
function SendToDeskButton({ lead }: { lead: Lead }) {
  const send = useSendToDesk();
  const toast = useToast();
  const onDesk = Boolean(lead.sent_to_desk_at);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={onDesk ? "secondary" : "primary"}
        size="sm"
        loading={send.isPending}
        onClick={() =>
          send.mutate(lead.id, {
            onSuccess: () => toast.success(SEND_TO_DESK.sent(lead.company_name)),
            onError: (e) => toast.error(e instanceof Error ? e.message : SEND_TO_DESK.failed),
          })
        }
      >
        {onDesk ? SEND_TO_DESK.resend : SEND_TO_DESK.send}
      </Button>
      {onDesk && (
        <span className="text-[0.78rem] text-muted">{SEND_TO_DESK.onDesk(addedAt(lead.sent_to_desk_at))}</span>
      )}
    </div>
  );
}

function ClassificationPanel({ lead }: { lead: Lead }) {
  // The form itself lives in components/leads/lead-edit-form.tsx -- shared with EditLeadDialog, the
  // popup version other pages use (Cold Call Desk, Pipeline, Projects, Meetings). Here it renders
  // inline, same as always, since this page IS the "Leads" destination those popups edit into.
  return <LeadEditForm lead={lead} />;
}

/** CSV export built in the browser — same columns as the Streamlit download_button. */
function CsvExportButton({ leads, category }: { leads: Lead[]; category: string }) {
  function download() {
    const header = [
      "ID", "Company", "Website", "Contact Name", "Role", "Email", "Phone",
      "LinkedIn", "Industry Tag", "Deal Value", "Stage", "Notes", "Created At",
    ];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = leads.map((l) =>
      [
        l.id, l.company_name, l.company_website, l.contact_name, l.contact_role,
        // The backend sentinels a missing email as the literal "unknown" (see
        // hasUsableEmail's docstring) -- exporting that string would look like
        // a real address to whoever opens this CSV, so blank it here.
        hasUsableEmail(l.contact_email) ? l.contact_email : "",
        l.contact_phone, l.contact_linkedin, l.industry_tag,
        l.deal_value, STAGE_LABELS[l.pipeline_stage], l.notes, l.created_at,
      ].map(esc).join(","),
    );
    const csv = [header.map(esc).join(","), ...rows].join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `elipse_${category.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_contacts.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="secondary" size="sm" onClick={download}>
      📥 Export {leads.length} Filtered Contacts to CSV
    </Button>
  );
}

export function ContactsView({ initialLeads, q }: { initialLeads: Lead[]; q: string }) {
  const { data: allLeads = [] } = useLeads({ q }, initialLeads);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [country, setCountry] = useState(ALL_COUNTRIES);
  const [source, setSource] = useState(ALL_SOURCES);

  const leads = useMemo(
    () =>
      allLeads.filter(
        (l) =>
          (category === ALL_CATEGORIES || l.industry_tag === category) &&
          (country === ALL_COUNTRIES ||
            (country === UNKNOWN_COUNTRY ? !l.country : l.country === country)) &&
          (source === ALL_SOURCES || leadSource(l.source_prompt) === source),
      ),
    [allLeads, category, country, source],
  );

  // Replaces the old "Active Sector Overview" (totalValue/draftReady/outreach/booked) card -- user
  // request, 2026-09-22: "yeh jo hai is ko hata do... todays leads or this week leads ki block bana kr
  // woh show krwao". Both counts respect the same Category/Country/Source filters `leads` already does.
  const leadsToday = leads.filter((l) => isToday(l.created_at)).length;
  const leadsThisWeek = leads.filter((l) => isThisWeek(l.created_at)).length;

  return (
    <>
      <div className="mb-4 grid grid-cols-3 gap-4">
        <Field label="Category Filter">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value={ALL_CATEGORIES}>{ALL_CATEGORIES}</option>
            {STANDARD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Country Filter">
          <Select value={country} onChange={(e) => setCountry(e.target.value)}>
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

      {/* Two separate blocks, not one shared card (user, 2026-09-22 -- "yeh is trhn sy nhi do, block
          banao"), same MetricCard the Today page's own stat row uses. */}
      <div className="my-4 grid grid-cols-2 gap-4">
        <MetricCard label="📅 Today's Leads" value={String(leadsToday)} />
        <MetricCard label="🗓️ This Week's Leads" value={String(leadsThisWeek)} />
      </div>

      <div className="mb-4">
        <CsvExportButton leads={leads} category={category} />
      </div>

      {leads.length === 0 && <p className="text-muted">{EMPTY_STATES.contacts(category)}</p>}

      {leads.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          summary={
            <span className="text-[0.95rem]">
              👤 <strong>{contactLabel(lead)}</strong> · <strong>{lead.company_name}</strong>
              <span className="text-muted">
                {" "}
                — {currency(lead.deal_value)} · {lead.industry_tag} (
                {STAGE_LABELS[lead.pipeline_stage]})
              </span>
              <span className="ml-2 text-[0.75rem] text-muted">
                🕒 {addedAt(lead.created_at)} · {LEAD_SOURCE_LABELS[leadSource(lead.source_prompt)]}
                <LeadWho lead={lead} />
              </span>
            </span>
          }
        >
          <div className="mb-4">
            <SendToDeskButton lead={lead} />
          </div>
          <div className="grid grid-cols-[1.8fr_1.8fr_1.4fr] gap-6">
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
              <p className="text-[0.85rem]">
                👤 {lead.contact_name || "—"}
                {lead.contact_role && <span className="text-muted"> · {lead.contact_role}</span>}
              </p>
              {hasUsableEmail(lead.contact_email) && (
                <p className="text-[1rem] font-medium text-text">✉️ {lead.contact_email}</p>
              )}
              {lead.contact_phone && <PhoneNumberList phones={lead.contact_phone} />}
              <p className="text-[0.85rem] text-muted">
                🌍 {lead.country ? countryLabel(lead.country) : "Not specified"}
              </p>

              <LinkedInResearchPanel lead={lead} />
              <HunterDecisionMakers lead={lead} />
              <SiteScanPanel lead={lead} />

              {lead.reason && (
                <p className="text-[0.82rem] text-muted">
                  <strong>Sales Angle:</strong> {lead.reason}
                </p>
              )}
            </div>

            <ClassificationPanel lead={lead} />
            <NotesPanel lead={lead} />
          </div>
        </LeadCard>
      ))}
    </>
  );
}
