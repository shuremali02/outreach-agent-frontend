"use client";

import { useMemo, useState } from "react";
import { useLeads, useUpdateLead } from "@/hooks/use-leads";
import { LeadCard } from "@/components/leads/lead-card";
import { CategoryPills } from "@/components/leads/category-pills";
import { LinkedInResearchPanel, HunterDecisionMakers, SiteScanPanel } from "@/components/enrichment";
import { MailtoButton } from "@/components/common/mailto-button";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { TerminalPill } from "@/components/ui/tag";
import { PIPELINE_STAGES, STAGE_LABELS, STANDARD_CATEGORIES, ALL_CATEGORIES } from "@/lib/constants";
import { currency, externalUrl, displayDomain, hasUsableEmail, contactLabel } from "@/lib/format";
import type { Lead, PipelineStage } from "@/types";
import { EMPTY_STATES } from "@/lib/constants";

function ClassificationPanel({ lead }: { lead: Lead }) {
  const update = useUpdateLead();
  const [category, setCategory] = useState(lead.industry_tag);
  const [stage, setStage] = useState<PipelineStage>(lead.pipeline_stage);
  const [phone, setPhone] = useState(lead.contact_phone);
  const [linkedin, setLinkedin] = useState(lead.contact_linkedin);
  const [dealValue, setDealValue] = useState(lead.deal_value);

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
      <Button
        variant="primary"
        size="sm"
        disabled={update.isPending}
        onClick={() =>
          update.mutate({
            id: lead.id,
            input: {
              industry_tag: category,
              pipeline_stage: stage,
              contact_phone: phone,
              contact_linkedin: linkedin,
              deal_value: dealValue,
            },
          })
        }
      >
        💾 Save Lead Details
      </Button>
    </div>
  );
}

function NotesPanel({ lead }: { lead: Lead }) {
  const update = useUpdateLead();
  const [notes, setNotes] = useState(lead.notes);

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-[1rem] font-semibold">📝 Notes &amp; Actions</h4>
      <Field label="Relationship Notes">
        <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Button
        variant="primary"
        size="sm"
        disabled={update.isPending}
        onClick={() => update.mutate({ id: lead.id, input: { notes } })}
      >
        💾 Save Notes
      </Button>
      <MailtoButton
        email={lead.contact_email}
        subject={lead.subject}
        body={lead.body}
        label="📧 Open in Email App"
        block
      />
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

  const leads = useMemo(
    () => (category === ALL_CATEGORIES ? allLeads : allLeads.filter((l) => l.industry_tag === category)),
    [allLeads, category],
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
      <p className="date-eyebrow">🏷️ Browse Leads by Category</p>
      <CategoryPills leads={allLeads} selected={category} onSelect={setCategory} allLabel="All Leads" />

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
              {lead.contact_phone && <p className="text-[0.85rem] text-muted">📞 {lead.contact_phone}</p>}

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
