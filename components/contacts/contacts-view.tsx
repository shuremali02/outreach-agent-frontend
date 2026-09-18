"use client";

import { useMemo, useState } from "react";
import { useLeads, useUpdateLead } from "@/hooks/use-leads";
import { LeadCard } from "@/components/leads/lead-card";
import { NotesPanel } from "@/components/leads/notes-panel";
import { PhoneNumberList } from "@/components/leads/phone-number-list";
// CategoryPills/CountryPills/SourcePills no longer used here -- this page's
// filters were converted to dropdowns to match Cold Call Desk/Pipeline (see
// docs.md). The components themselves are kept, unused, in case a pill-style
// filter is wanted again somewhere.
import { LinkedInResearchPanel, HunterDecisionMakers, SiteScanPanel } from "@/components/enrichment";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { TerminalPill } from "@/components/ui/tag";
import {
  COUNTRIES,
  ALL_SOURCES,
  MEETING_BOOKING,
  PIPELINE_STAGES,
  STAGE_LABELS,
  STANDARD_CATEGORIES,
  ALL_CATEGORIES,
  ALL_COUNTRIES,
  UNKNOWN_COUNTRY,
  LEAD_SOURCE_LABELS,
  countryLabel,
} from "@/lib/constants";
import { addedAt, currency, externalUrl, displayDomain, hasUsableEmail, contactLabel, leadSource } from "@/lib/format";
import type { Lead, PipelineStage } from "@/types";
import { EMPTY_STATES } from "@/lib/constants";

function ClassificationPanel({ lead }: { lead: Lead }) {
  const update = useUpdateLead();
  const [category, setCategory] = useState(lead.industry_tag);
  const [stage, setStage] = useState<PipelineStage>(lead.pipeline_stage);
  const [phone, setPhone] = useState(lead.contact_phone);
  const [linkedin, setLinkedin] = useState(lead.contact_linkedin);
  const [dealValue, setDealValue] = useState(lead.deal_value);
  // See pipeline-view.tsx ManageDeal's identical field -- corrects a wrong
  // or missing country on an already-saved lead.
  const [country, setCountry] = useState(lead.country);
  // See pipeline-view.tsx ManageDeal's identical fields -- this panel had no
  // way at all to set a meeting date/time, so selecting "Meeting Booked"
  // here always left meeting_at null, silently invisible on the Meetings
  // tab despite the lead being correctly staged (see docs.md 2026-09-16).
  const [meetingDate, setMeetingDate] = useState(lead.meeting_at ? lead.meeting_at.slice(0, 10) : "");
  const [meetingTime, setMeetingTime] = useState(lead.meeting_at ? lead.meeting_at.slice(11, 16) : "");

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-[1rem] font-semibold">🏷️ Classification &amp; Deal</h4>
      <Field label="Category">
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          {STANDARD_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Pipeline Stage">
        <Select value={stage} onChange={(e) => setStage(e.target.value as PipelineStage)}>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
      </Field>
      {stage === "meeting_booked" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label={MEETING_BOOKING.dateLabel}>
              <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
            </Field>
            <Field label={MEETING_BOOKING.timeLabel}>
              <Input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} />
            </Field>
          </div>
          {!(meetingDate && meetingTime) && (
            <p
              className="rounded-[8px] px-3 py-2 text-[0.8rem]"
              style={{ background: "var(--warn-tint)", color: "var(--warn)" }}
            >
              Set both Date and Time — without them this lead is staged as Meeting Booked but
              will not appear on the Meetings tab.
            </p>
          )}
        </>
      )}
      <Field label="Contact Phone">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <Field label="LinkedIn URL">
        <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
      </Field>
      <Field label="Deal Value ($)">
        <Input
          type="number"
          step={1000}
          min={0}
          value={dealValue}
          onChange={(e) => setDealValue(Number(e.target.value))}
        />
      </Field>
      <Field label="Country">
        <Select value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">Not specified</option>
          {COUNTRIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Button
        variant="primary"
        size="sm"
        disabled={update.isPending || (stage === "meeting_booked" && !(meetingDate && meetingTime))}
        onClick={() =>
          update.mutate({
            id: lead.id,
            input: {
              industry_tag: category,
              pipeline_stage: stage,
              contact_phone: phone,
              contact_linkedin: linkedin,
              deal_value: dealValue,
              country,
              ...(meetingDate && meetingTime
                ? { meeting_at: `${meetingDate}T${meetingTime}:00` }
                : {}),
            },
          })
        }
      >
        💾 Save Lead Details
      </Button>
    </div>
  );
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

  const totalValue = leads.reduce((s, l) => s + l.deal_value, 0);
  const draftReady = leads.filter((l) => l.pipeline_stage === "draft_ready").length;
  const outreach = leads.filter((l) =>
    ["contacted", "followup_due"].includes(l.pipeline_stage),
  ).length;
  const booked = leads.filter((l) =>
    ["meeting_booked", "proposal_sent", "won"].includes(l.pipeline_stage),
  ).length;

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

      <Card accent="accent" className="my-4">
        <p className="date-eyebrow">Active Sector Overview</p>
        <h2 className="serif-title text-[1.5rem] font-bold">
          {category === ALL_CATEGORIES ? "🌐 All Industry Sectors" : category}
        </h2>
        <p className="mt-1 text-[0.9rem] text-muted">
          Showing {leads.length} accounts · {currency(totalValue)} combined pipeline value
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <TerminalPill variant="blue">📝 {draftReady} Draft Ready</TerminalPill>
          <TerminalPill variant="amber">📤 {outreach} Outreach / Due</TerminalPill>
          <TerminalPill variant="green">🎯 {booked} Booked / Pipeline</TerminalPill>
        </div>
      </Card>

      <div className="mb-4">
        <CsvExportButton leads={leads} category={category} />
      </div>

      {leads.length === 0 && <p className="text-muted">{EMPTY_STATES.contacts(category)}</p>}

      {leads.map((lead) => (
        <LeadCard
          key={lead.id}
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
              </span>
            </span>
          }
        >
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
                <p className="text-[0.85rem] text-muted">✉️ {lead.contact_email}</p>
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
