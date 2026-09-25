"use client";

import { useMemo, useState } from "react";
import { useLeads, useUpdateLead } from "@/hooks/use-leads";
import { useNow } from "@/hooks/use-now";
import { EditLeadDialog } from "@/components/leads/edit-lead-dialog";
import { LeadCard } from "@/components/leads/lead-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { MailtoButton } from "@/components/common/mailto-button";
import { LEAD_CARD, NEEDS_FOLLOWUP, PIPELINE_CARD, STAGE_LABELS, TOASTS } from "@/lib/constants";
import { addedAt, hasUsableEmail } from "@/lib/format";
import type { Lead } from "@/types";
import { Ico, stripEmoji, withIcons } from "@/components/ui/emoji-icon";

/** The pre-composed 2nd-touch draft from app.py, with the calendar link inlined. Same text the old
 * Follow-ups page's "After meetings" tab used. */
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

function NeedsFollowUpCard({ lead, calendarLink }: { lead: Lead; calendarLink: string }) {
  const update = useUpdateLead();
  const toast = useToast();
  const [draft, setDraft] = useState(() => secondTouch(lead, calendarLink));

  return (
    <LeadCard
      lead={lead}
      summary={
        <span className="text-[0.95rem]">
          <Ico e="🔁" /> <strong>{lead.company_name}</strong>
          <span className="text-muted">
            {" "}
            — Next Step for {lead.contact_name || "this account"}
            {lead.meeting_at && ` · met ${addedAt(lead.meeting_at)}`}
          </span>
          <span className="stage-tag ml-2">{STAGE_LABELS[lead.pipeline_stage]}</span>
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        {hasUsableEmail(lead.contact_email) && (
          <p className="text-[1rem] font-medium text-text"><Ico e="✉" /> {lead.contact_email}</p>
        )}
        {lead.subject && (
          <p className="text-[0.85rem] text-muted">
            <strong>{LEAD_CARD.followUpSubject}</strong> {lead.subject}
          </p>
        )}
        {lead.notes && (
          <div>
            <h4 className="mb-1 text-[1rem] font-semibold"><Ico e="📝" /> Notes</h4>
            <p className="whitespace-pre-line rounded-[8px] bg-input px-3 py-2 text-[0.85rem]">{lead.notes}</p>
          </div>
        )}
        <div>
          <h4 className="mb-1 text-[1rem] font-semibold"><Ico e="⚡" /> Quick Follow-up Draft</h4>
          <Textarea rows={6} value={draft} onChange={(e) => setDraft(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MailtoButton
            email={lead.contact_email}
            subject={`Re: ${lead.subject}`}
            body={draft}
            label="📧 Send Follow-up (1-Click)"
            block
          />
          {/* Only meaningful for a lead that is waiting at Needs Follow-up; one already at another stage
              (Meeting Booked, Proposal Sent, ...) changes stage from Edit below or the calendar popup. */}
          {lead.pipeline_stage === "followup_due" && (
          <Button
            variant="primary"
            loading={update.isPending}
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
            <Ico e="✅" /> Mark as Meeting Booked
          </Button>
          )}
        </div>
        {update.isError && (
          <p className="text-[0.8rem] text-danger">
            {update.error instanceof Error ? update.error.message : "Failed to update this lead. Try again."}
          </p>
        )}
        {/* Closed/Not Interested/anything else -- structure-plan.md Phase 2/4: editing lives in Leads. */}
        <EditLeadDialog
          lead={lead}
          trigger={
            <button type="button" className="cursor-pointer text-left text-[0.82rem] font-semibold text-accent underline">
              {withIcons(PIPELINE_CARD.editInContacts)}
            </button>
          }
        />
      </div>
    </LeadCard>
  );
}

/**
 * "After Meetings": every lead whose meeting time has already passed, at ANY stage (user, 2026-09-25: "har
 * lead jiski meeting ho chuki" -- it used to be only the ones a meeting outcome marked Needs Follow-up, so
 * a lead still sitting at Meeting Booked after its date, or moved on to Proposal Sent / Client Closed,
 * never showed). Not Interested / Closed Lost leads are left out (hidden ones never reach the list at all --
 * crud.list_leads() drops them -- and a lead merely staged "lost" is filtered below).
 *
 * One exception kept from before: a lead at "followup_due" that is back on the Cold Call Desk
 * (sent_to_desk_at set) belongs there -- a Cold Call voicemail/no-answer/hang-up ALSO lands on
 * "followup_due" and still carries any old meeting_at.
 */
export function NeedsFollowUpList({ initialLeads, calendarLink }: { initialLeads: Lead[]; calendarLink: string }) {
  const { data: allLeads = [] } = useLeads({}, initialLeads);
  // null on the server and during hydration (see hooks/use-now.ts) -- nothing is painted until the clock is known.
  const now = useNow();
  const scoped = useMemo(
    () =>
      now === null
        ? []
        : allLeads.filter(
            (l) =>
              Boolean(l.meeting_at) &&
              // Not Interested / Closed Lost never shows here (user, 2026-09-25) -- also covers a lost lead that
              // was set through the Edit form, which does not hide it the way the meeting popup's button does.
              l.pipeline_stage !== "lost" &&
              // meeting_at is a naive wall-clock ISO string; new Date() reads it as local time, same as it was typed.
              new Date(l.meeting_at as string).getTime() <= now &&
              !(l.pipeline_stage === "followup_due" && l.sent_to_desk_at),
          ),
    [allLeads, now],
  );

  const [search, setSearch] = useState("");
  const [sortRecent, setSortRecent] = useState(true);
  const leads = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = scoped.filter(
      (l) =>
        !q ||
        l.company_name.toLowerCase().includes(q) ||
        (l.contact_name || "").toLowerCase().includes(q) ||
        (l.contact_email || "").toLowerCase().includes(q),
    );
    return [...filtered].sort((a, b) =>
      sortRecent ? b.updated_at.localeCompare(a.updated_at) : a.updated_at.localeCompare(b.updated_at),
    );
  }, [scoped, search, sortRecent]);

  if (scoped.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[1.05rem] font-semibold">{withIcons(NEEDS_FOLLOWUP.heading(scoped.length))}</h3>
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={NEEDS_FOLLOWUP.searchPlaceholder}
          aria-label={NEEDS_FOLLOWUP.searchPlaceholder}
          className="w-full sm:w-72"
        />
      </div>
      <p className="mb-3 text-[0.85rem] text-muted">
        {NEEDS_FOLLOWUP.note} · {NEEDS_FOLLOWUP.showing(leads.length, scoped.length)}
      </p>
      <div className="mb-3 max-w-xs">
        <Field label="Sort By">
          <Select value={sortRecent ? "recent" : "oldest"} onChange={(e) => setSortRecent(e.target.value === "recent")}>
            <option value="recent">{stripEmoji(NEEDS_FOLLOWUP.sortRecent)}</option>
            <option value="oldest">{stripEmoji(NEEDS_FOLLOWUP.sortOldest)}</option>
          </Select>
        </Field>
      </div>
      {leads.length === 0 ? (
        <p className="rounded-[8px] px-3 py-2 text-[0.9rem]" style={{ background: "var(--info-tint)", color: "var(--info)" }}>
          {withIcons(NEEDS_FOLLOWUP.empty)}
        </p>
      ) : (
        leads.map((lead) => <NeedsFollowUpCard key={lead.id} lead={lead} calendarLink={calendarLink} />)
      )}
    </div>
  );
}
