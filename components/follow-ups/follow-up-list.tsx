"use client";

import { useMemo, useState } from "react";
import { useLeads, useUpdateLead } from "@/hooks/use-leads";
import { LeadCard } from "@/components/leads/lead-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { MailtoButton } from "@/components/common/mailto-button";
import {
  ALL_SOURCES,
  DISPOSITIONS,
  FOLLOWUP_STAGES,
  LEAD_SOURCE_LABELS,
  STAGE_LABELS,
} from "@/lib/constants";
import { hasUsableEmail, leadSource } from "@/lib/format";
import type { Lead } from "@/types";
import { EMPTY_STATES, FOLLOWUPS_VIEW, LEAD_CARD, TOASTS } from "@/lib/constants";

/** outcome -> button label ("🟡 Voicemail"), reused so the filter and the
 * badge on each card read exactly the same word the rep clicked. */
const OUTCOME_LABELS: Record<string, string> = Object.fromEntries(
  DISPOSITIONS.map((d) => [d.outcome, d.label]),
);
const ALL_REASONS = "All Reasons";

/**
 * dead_number/not_interested/wrong_number route to pipeline_stage "lost",
 * and meeting_booked routes to its own "meeting_booked" stage (crud/leads.py
 * _OUTCOME_STAGE) -- a lead with any of these never lands in a Follow-up
 * stage, so offering them here would just be a filter option that always
 * returns nothing. Per user request 2026-09-17 (dead_number/wrong_number)
 * and 2026-09-18 (the other two, found while adding the Source filter).
 */
const NOT_A_FOLLOWUP_REASON = new Set(["dead_number", "not_interested", "wrong_number", "meeting_booked"]);
const FOLLOWUP_REASONS = DISPOSITIONS.filter((d) => !NOT_A_FOLLOWUP_REASON.has(d.outcome));

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
  const toast = useToast();
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
            {lead.meeting_at && ` · ${FOLLOWUPS_VIEW.afterMeeting(new Date(lead.meeting_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }))}`}
          </span>
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        {hasUsableEmail(lead.contact_email) && (
          <p className="text-[1rem] font-medium text-text">✉️ {lead.contact_email}</p>
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
              update.mutate(
                { id: lead.id, input: { pipeline_stage: "meeting_booked" } },
                {
                  onSuccess: () => toast.success(TOASTS.stageChanged(lead.company_name, "Meeting Booked")),
                  onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
                },
              )
            }
          >
            ✅ Mark as Meeting Booked
          </Button>
        </div>
        {update.isError && (
          <p className="text-[0.8rem] text-danger">
            {update.error instanceof Error ? update.error.message : "Failed to update this lead. Try again."}
          </p>
        )}
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

  // Find-it tools. This page holds every lead in Follow-up Due / Proposal Sent /
  // Outreach Sent -- hundreds -- and used to list them by when the lead was
  // CREATED, so a lead you had just moved here after a meeting was buried in the
  // pile with no search ("yeh gaya kahan?", 2026-09-19). Now: search box, stage
  // filter with counts, and most-recently-updated first by default.
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sortRecent, setSortRecent] = useState(true);
  const stageCounts = FOLLOWUP_STAGES.map((st) => ({
    id: st,
    count: stageLeads.filter((l) => l.pipeline_stage === st).length,
  }));

  // Reason filter: pipeline_stage alone can't say WHY a lead landed here --
  // voicemail, callback_scheduled and receptionist all collapse to the same
  // "followup_due" stage. Always shows every disposition (not just ones
  // currently present, per user request 2026-09-17 -- "Decision Maker" and
  // "Closed" weren't showing simply because no lead had that outcome YET),
  // matching how Pipeline/Contacts' Category/Country/Source filters always
  // show their full option list too.
  const [reason, setReason] = useState(ALL_REASONS);
  // Source filter, matching Pipeline/Cold Call Desk's own: "which Sales
  // Team lead went to voicemail" needs both filters combined, per user
  // request 2026-09-18. leadSource() is derived client-side from
  // source_prompt, same as those two -- never a real backend filter.
  const [source, setSource] = useState(ALL_SOURCES);
  const leads = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = stageLeads.filter(
      (l) =>
        (stageFilter === "all" || l.pipeline_stage === stageFilter) &&
        (reason === ALL_REASONS || l.last_call_outcome === reason) &&
        (source === ALL_SOURCES || leadSource(l.source_prompt) === source) &&
        (!q ||
          l.company_name.toLowerCase().includes(q) ||
          (l.contact_name || "").toLowerCase().includes(q) ||
          (l.contact_email || "").toLowerCase().includes(q)),
    );
    return [...filtered].sort((a, b) =>
      sortRecent ? b.updated_at.localeCompare(a.updated_at) : a.updated_at.localeCompare(b.updated_at),
    );
  }, [stageLeads, stageFilter, reason, source, search, sortRecent]);

  if (stageLeads.length === 0) {
    return (
      <p className="rounded-[8px] px-3 py-2 text-[0.9rem]" style={{ background: "var(--info-tint)", color: "var(--info)" }}>
        {EMPTY_STATES.followUps}
      </p>
    );
  }

  return (
    <>
      <div className="mb-3 max-w-xl">
        <Field label={FOLLOWUPS_VIEW.searchLabel}>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={FOLLOWUPS_VIEW.searchPlaceholder}
          />
        </Field>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-4 max-w-xl">
        <Field label="Stage Filter">
          <Select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="all">{FOLLOWUPS_VIEW.allStages(stageLeads.length)}</option>
            {stageCounts.map((st) => (
              <option key={st.id} value={st.id}>
                {STAGE_LABELS[st.id]} ({st.count})
              </option>
            ))}
          </Select>
        </Field>
        <Field label={FOLLOWUPS_VIEW.sortLabel}>
          <Select value={sortRecent ? "recent" : "oldest"} onChange={(e) => setSortRecent(e.target.value === "recent")}>
            <option value="recent">{FOLLOWUPS_VIEW.sortRecent}</option>
            <option value="oldest">{FOLLOWUPS_VIEW.sortOldest}</option>
          </Select>
        </Field>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-4 max-w-xl">
        <Field label="Reason Filter">
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value={ALL_REASONS}>{ALL_REASONS}</option>
            {FOLLOWUP_REASONS.map((d) => (
              <option key={d.outcome} value={d.outcome}>
                {d.label}
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
      <p className="mb-3 text-[0.85rem] text-muted">{FOLLOWUPS_VIEW.showing(leads.length, stageLeads.length)}</p>
      {leads.length === 0 && (
        <p className="rounded-[8px] px-3 py-2 text-[0.9rem]" style={{ background: "var(--info-tint)", color: "var(--info)" }}>
          {EMPTY_STATES.followUpsFiltered}
        </p>
      )}
      {leads.map((lead) => (
        <FollowUpCard key={lead.id} lead={lead} calendarLink={calendarLink} />
      ))}
    </>
  );
}
