"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { useLeads, useUpdateLead, useDeleteLead } from "@/hooks/use-leads";
import { LeadCard } from "@/components/leads/lead-card";
import { LinkedInResearchPanel, HunterDecisionMakers, SiteScanPanel } from "@/components/enrichment";
import { MailtoButton } from "@/components/common/mailto-button";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { PIPELINE_STAGES, STAGE_LABELS, STANDARD_CATEGORIES, ALL_CATEGORIES } from "@/lib/constants";
import { currency, externalUrl, displayDomain, hasUsableEmail } from "@/lib/format";
import type { Lead, PipelineStage } from "@/types";
import { EMPTY_STATES } from "@/lib/constants";

function ManageDeal({ lead }: { lead: Lead }) {
  const update = useUpdateLead();
  const remove = useDeleteLead();

  const [subject, setSubject] = useState(lead.subject);
  const [body, setBody] = useState(lead.body);
  const [dealValue, setDealValue] = useState(lead.deal_value);
  const [stage, setStage] = useState<PipelineStage>(lead.pipeline_stage);
  const [phone, setPhone] = useState(lead.contact_phone);
  const [linkedin, setLinkedin] = useState(lead.contact_linkedin);

  return (
    <>
      <div className="flex flex-col gap-3">
        <h4 className="text-[1rem] font-semibold">✉️ Outreach Draft</h4>
        <Field label="Subject">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={500} />
        </Field>
        <Field label="Body">
          <Textarea rows={7} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="text-[1rem] font-semibold">⚙️ Manage Deal</h4>
        <Field label="Deal Value ($)">
          <Input
            type="number"
            step={1000}
            min={0}
            value={dealValue}
            onChange={(e) => setDealValue(Number(e.target.value))}
          />
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

        <Button
          variant="primary"
          size="sm"
          disabled={update.isPending}
          onClick={() =>
            update.mutate({
              id: lead.id,
              input: {
                subject,
                body,
                deal_value: dealValue,
                pipeline_stage: stage,
                contact_phone: phone,
                contact_linkedin: linkedin,
              },
            })
          }
        >
          {update.isPending ? "Saving…" : "💾 Save Updates"}
        </Button>

        <Button
          variant="danger"
          size="sm"
          disabled={remove.isPending}
          onClick={() => {
            if (confirm(`Remove ${lead.company_name} from the CRM?`)) remove.mutate(lead.id);
          }}
        >
          🗑️ Remove
        </Button>

        {/* Uses the EDITED subject/body, as app.py did. */}
        <MailtoButton
          email={lead.contact_email}
          subject={subject}
          body={body}
          label="📧 Open in Mail App"
          block
        />
      </div>
    </>
  );
}

export function PipelineView({
  initialLeads,
  stage,
  category,
  q,
}: {
  initialLeads: Lead[];
  stage: PipelineStage | "all";
  category: string;
  q: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: leads = [] } = useLeads({ stage, category, q }, initialLeads);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all" && value !== ALL_CATEGORIES) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-4">
        <Field label="Stage Filter">
          <Select value={stage} onChange={(e) => setParam("stage", e.target.value)}>
            <option value="all">All Stages</option>
            {PIPELINE_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
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
      </div>

      {leads.length === 0 && <p className="text-muted">{EMPTY_STATES.pipeline}</p>}

      {leads.map((lead) => (
        <LeadCard
          key={lead.id}
          summary={
            <span className="text-[0.95rem]">
              💼 <strong>{lead.company_name}</strong>
              <span className="text-muted">
                {" "}
                — {currency(lead.deal_value)} · {lead.industry_tag} (
                {STAGE_LABELS[lead.pipeline_stage]})
              </span>
            </span>
          }
        >
          <div className="grid grid-cols-[2fr_2fr_1.5fr] gap-6">
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
                <p className="text-[0.85rem] text-muted">✉️ {lead.contact_email}</p>
              )}
              {lead.contact_phone && <p className="text-[0.85rem] text-muted">📞 {lead.contact_phone}</p>}

              <LinkedInResearchPanel lead={lead} />
              <HunterDecisionMakers lead={lead} />
              <SiteScanPanel lead={lead} />

              <p className="text-[0.82rem] text-muted">
                <strong>Category:</strong> {lead.industry_tag}
              </p>
              {lead.reason && (
                <p className="text-[0.82rem] text-muted">
                  <strong>Angle:</strong> {lead.reason}
                </p>
              )}
            </div>

            <ManageDeal lead={lead} />
          </div>
        </LeadCard>
      ))}
    </>
  );
}
