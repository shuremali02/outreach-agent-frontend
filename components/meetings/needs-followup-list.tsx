"use client";

import { useMemo, useState } from "react";
import { useLeads, useUpdateLead } from "@/hooks/use-leads";
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
          {/* Badges in their own always-wrapped group, not loose inline text: on a phone this run-on
              line (icon + bold company name + muted description + an uppercase stage pill) wrapped
              unpredictably depending on how long the company/contact name happened to be, so a bold
              pill like "FOLLOW-UP DUE" sometimes landed stranded alone on its own line, mid-sentence,
              making every card a different shape (user screenshot, 2026-10-03: "cards equal nahi hain").
              `block` below `sm` gives every card the same predictable shape (text, then badges on their
              own line); `sm:inline sm:ml-2` restores today's exact inline-at-the-end-of-the-line look. */}
          <span className="mt-1 block sm:ml-2 sm:mt-0 sm:inline">
            <span className="stage-tag">{STAGE_LABELS[lead.pipeline_stage]}</span>
            {/* User, 2026-09-28: "kese pata hoga ke yeh banda already meeting booked tha pehle" -- this list
                is exactly where a No Show ends up (still at followup_due), so it needs the tag most. */}
            {lead.no_show_at && (
              <span
                className="ml-2 rounded-[6px] px-1.5 py-0.5 text-[0.75rem] font-semibold"
                style={{ background: "var(--danger-tint)", color: "var(--danger)" }}
              >
                {withIcons(
                  PIPELINE_CARD.noShowTag(
                    new Date(lead.no_show_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  ),
                )}
              </span>
            )}
          </span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
 * "After Meetings": every lead that WAS booked for a meeting and has since been given an outcome -- i.e.
 * its stage is no longer "meeting_booked" (Needs Follow-up, No Show, Proposal Sent, Client Closed all
 * count). NOT a meeting still sitting unactioned at Meeting Booked, whether its time is in the past or the
 * future -- that's not "after", it hasn't been dealt with yet. This replaced an earlier time-based version
 * (meeting_at <= now, any stage) that the No Show button exposed as wrong: "meeting hui hi nahi toh after
 * meeting mein kaise ja raha hai" -- a No Show lead's meeting time had passed, so it kept showing here even
 * though no meeting actually took place; what actually matters is whether an outcome was recorded, not the
 * clock.
 *
 * Not Interested is explicitly EXCLUDED here (REVERSED 2026-09-30, user: "closed lost aftermeeting sy hatana
 * hai" -- an earlier request, 2026-09-28, had asked for the opposite: "not intrested wala bhi... taky pata
 * ho meeting k bad ka", so this is a deliberate reversal, not an oversight). `includeMeetingHidden: true`
 * stays on the useLeads() call below anyway -- it's shared with page.tsx/meetings-calendar.tsx and changing
 * it here would fetch with different params and lose their React Query cache/initialData sharing; the
 * client-side `!== "lost"` check below is what actually keeps a Not Interested lead off this list now,
 * regardless of what the fetch itself re-admits. A lead at "followup_due" that is back on the Cold Call
 * Desk (sent_to_desk_at set) belongs there instead -- a Cold Call voicemail/no-answer/hang-up ALSO lands on
 * "followup_due" and may still carry an old meeting_at from a previous meeting.
 */
export function NeedsFollowUpList({ initialLeads, calendarLink }: { initialLeads: Lead[]; calendarLink: string }) {
  const { data: allLeads = [] } = useLeads({ includeMeetingHidden: true }, initialLeads);
  const scoped = useMemo(
    () =>
      allLeads.filter(
        (l) =>
          Boolean(l.meeting_at) &&
          // The one thing that puts a lead here: an outcome was given (stage moved off "meeting_booked").
          // NOT time-based any more -- see the doc comment above for why.
          l.pipeline_stage !== "meeting_booked" &&
          l.pipeline_stage !== "lost" &&
          !(l.pipeline_stage === "followup_due" && l.sent_to_desk_at),
      ),
    [allLeads],
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

  // Collapsed by default (user, 2026-10-06: "meeting tab par on karte he humein recent activities na show
  // hon jaise abhi ho raha hai, hum dekhna chahein to show ho warna calendar he ho") -- opening Meetings
  // used to always show this whole list above the calendar; now it's one line (a toggle, same chevron
  // affordance LeadCard's own expander uses) until a rep actually wants to look at it.
  const [open, setOpen] = useState(false);

  if (scoped.length === 0) return null;

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mb-3 flex cursor-pointer items-center gap-2 text-left"
      >
        <span className="text-[1.1rem] text-muted" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
        <h3 className="text-[1.05rem] font-semibold">{withIcons(NEEDS_FOLLOWUP.heading(scoped.length))}</h3>
      </button>
      {open && (
        <>
          <div className="mb-3 flex justify-end">
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
        </>
      )}
    </div>
  );
}
