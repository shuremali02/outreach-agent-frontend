"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useLeads, useUpdateLead, useDeleteLead } from "@/hooks/use-leads";
import { LeadCard } from "@/components/leads/lead-card";
import { PhoneNumberList } from "@/components/leads/phone-number-list";
import { LinkedInResearchPanel, HunterDecisionMakers, SiteScanPanel } from "@/components/enrichment";
import { MailtoButton } from "@/components/common/mailto-button";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import {
  COUNTRIES,
  LEAD_SOURCE_LABELS,
  MEETING_BOOKING,
  PIPELINE_STAGES,
  STAGE_LABELS,
  STANDARD_CATEGORIES,
  ALL_CATEGORIES,
  ALL_COUNTRIES,
  ALL_SOURCES,
  UNKNOWN_COUNTRY,
  countryLabel,
} from "@/lib/constants";
import { addedAt, currency, externalUrl, displayDomain, hasUsableEmail, leadSource } from "@/lib/format";
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
  // Corrects a wrong or missing country on an already-saved lead -- discovery
  // tags this automatically now, but an older lead (pre-country-field) or a
  // bad website-domain guess (region_from_url) can still be wrong, and this
  // is the only place to fix it since none of the discovery paths re-run
  // themselves on an existing lead.
  const [country, setCountry] = useState(lead.country);
  // Seeded from lead.meeting_at (an ISO datetime, set at the "🎯 Booked!"
  // prompt on the Cold Call Desk) so this stays editable afterward -- a lead
  // that just became meeting_booked immediately leaves the Cold Call queue
  // and its Battlecard unmounts, so Pipeline is the only place left to fix a
  // wrong time.
  const [meetingDate, setMeetingDate] = useState(lead.meeting_at ? lead.meeting_at.slice(0, 10) : "");
  const [meetingTime, setMeetingTime] = useState(lead.meeting_at ? lead.meeting_at.slice(11, 16) : "");

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
                subject,
                body,
                deal_value: dealValue,
                pipeline_stage: stage,
                contact_phone: phone,
                contact_linkedin: linkedin,
                country,
                ...(meetingDate && meetingTime
                  ? { meeting_at: `${meetingDate}T${meetingTime}:00` }
                  : {}),
              },
            })
          }
        >
          {update.isPending ? "Saving…" : "💾 Save Updates"}
        </Button>
        {update.isError && (
          <p className="text-[0.8rem] text-danger">
            {update.error instanceof Error ? update.error.message : "Failed to save updates. Try again."}
          </p>
        )}

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
        {remove.isError && (
          <p className="text-[0.8rem] text-danger">
            {remove.error instanceof Error ? remove.error.message : "Failed to remove this lead. Try again."}
          </p>
        )}

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
  country,
  q,
}: {
  initialLeads: Lead[];
  stage: PipelineStage | "all";
  category: string;
  country: string;
  q: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: fetchedLeads = [] } = useLeads({ stage, category, country, q }, initialLeads);
  // Source (leadSource(), derived from source_prompt) isn't a backend
  // column, so unlike Stage/Category/Country it's never sent to the server
  // -- filtered client-side over whatever the server already returned.
  const [source, setSource] = useState(ALL_SOURCES);
  const leads = useMemo(
    () => fetchedLeads.filter((l) => source === ALL_SOURCES || leadSource(l.source_prompt) === source),
    [fetchedLeads, source],
  );

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all" && value !== ALL_CATEGORIES && value !== ALL_COUNTRIES) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <>
      <div className="mb-4 grid grid-cols-4 gap-4">
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
              {/* Ali (Sales Rep, 2026-09-15): leads couldn't be verified
                  without knowing when/how they were added. */}
              <span className="ml-2 text-[0.75rem] text-muted">
                🕒 {addedAt(lead.created_at)} · {LEAD_SOURCE_LABELS[leadSource(lead.source_prompt)]}
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
              {lead.contact_phone && <PhoneNumberList phones={lead.contact_phone} />}

              <LinkedInResearchPanel lead={lead} />
              <HunterDecisionMakers lead={lead} />
              <SiteScanPanel lead={lead} />

              <p className="text-[0.82rem] text-muted">
                <strong>Category:</strong> {lead.industry_tag}
              </p>
              <p className="text-[0.82rem] text-muted">
                <strong>Country:</strong> {lead.country ? countryLabel(lead.country) : "Not specified"}
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
