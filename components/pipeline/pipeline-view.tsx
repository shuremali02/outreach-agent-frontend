"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useLeads, useMeetingOutcome, useUpdateLead } from "@/hooks/use-leads";
import { EditLeadDialog } from "@/components/leads/edit-lead-dialog";
import { LeadCard } from "@/components/leads/lead-card";
import { LeadWho } from "@/components/leads/lead-who";
import { PhoneNumberList } from "@/components/leads/phone-number-list";
import { LinkedInResearchPanel, HunterDecisionMakers, SiteScanPanel } from "@/components/enrichment";
import { NotesPanel } from "@/components/leads/notes-panel";
import { MetricCard } from "@/components/metrics/metric-card";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { Select, Field, Input } from "@/components/ui/input";
import {
  COUNTRIES,
  LEAD_SOURCE_LABELS,
  STAGE_LABELS,
  STANDARD_CATEGORIES,
  ALL_CATEGORIES,
  ALL_COUNTRIES,
  ALL_SOURCES,
  UNKNOWN_COUNTRY,
  PIPELINE_VIEW_FILTER,
  PIPELINE_CARD,
  MEETING_OUTCOMES,
  MEETING_BOOKING,
  TOASTS,
  countryLabel,
} from "@/lib/constants";
import { addedAt, currency, externalUrl, displayDomain, hasUsableEmail, leadSource, shortDate } from "@/lib/format";
import type { Lead } from "@/types";
import { EMPTY_STATES } from "@/lib/constants";
import { CategoryLabel, Ico, stripEmoji, withIcons } from "@/components/ui/emoji-icon";

/** Has a callback (a set time, or a Callback Scheduled disposition) AND is not already Won / Lost. */
function hasOpenCallback(l: Lead): boolean {
  return (
    (Boolean(l.callback_at) || l.last_call_outcome === "callback_scheduled") &&
    l.pipeline_stage !== "won" &&
    l.pipeline_stage !== "lost"
  );
}

/**
 * Quick status-change actions on every Pipeline card (user, 2026-09-22: "hamesha us ka status purposal
 * sent ya callback ya email send nhi rhyga is lye har lead pr Not intrested, purposal send or meeting
 * booked or project closed yeh action yhn bhi hone chahiye har lead pr"). Same 4 destinations, same
 * behaviour, as the rest of the app's flow: Client Closed/Proposal Send/Not Interested reuse the exact
 * Meeting popup outcome (useMeetingOutcome() -- the dedicated endpoint, not a plain PATCH, because "Not
 * Interested" must ALSO hide the lead everywhere, which a plain update can't do). "Meeting Booked" asks
 * for a date/time first (same UI as Cold Call Desk's booking prompt) because meetings-calendar.tsx only
 * shows a lead once meeting_at is set -- a bare stage change would leave it off the Meetings tab.
 */
function PipelineActions({ lead }: { lead: Lead }) {
  const outcome = useMeetingOutcome();
  const update = useUpdateLead();
  const confirm = useConfirm();
  const toast = useToast();
  const [bookingPrompt, setBookingPrompt] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");

  // Not Interested / Proposal Send / Client Closed -- the same 3 (of 4) MEETING_OUTCOMES entries the
  // Meetings detail popup uses, minus "Needs Follow-up" (a post-meeting-only concept that doesn't apply
  // to a lead that may not have had a meeting yet).
  const actions = MEETING_OUTCOMES.filter((o) => o.stage !== "followup_due");

  async function setOutcome(o: (typeof actions)[number]) {
    const ok = await confirm({
      title: o.confirmTitle(lead.company_name),
      description: o.confirmBody,
      confirmLabel: o.confirmLabel,
      tone: o.stage === "lost" ? "danger" : "default",
    });
    if (!ok) return;
    outcome.mutate(
      { id: lead.id, stage: o.stage },
      {
        onSuccess: () => toast.success(o.done(lead.company_name)),
        onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
      },
    );
  }

  function confirmBooking() {
    if (!meetingDate || !meetingTime) return;
    update.mutate(
      {
        id: lead.id,
        input: { pipeline_stage: "meeting_booked", meeting_at: `${meetingDate}T${meetingTime}:00` },
      },
      {
        onSuccess: () => {
          toast.success(TOASTS.meetingBooked(lead.company_name));
          setBookingPrompt(false);
          setMeetingDate("");
          setMeetingTime("");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
      },
    );
  }

  if (bookingPrompt) {
    return (
      <div className="flex flex-col gap-2 rounded-[8px] border border-accent bg-input px-3 py-3">
        <p className="text-[0.85rem] font-semibold">{withIcons(MEETING_BOOKING.prompt)}</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label={MEETING_BOOKING.dateLabel}>
            <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
          </Field>
          <Field label={MEETING_BOOKING.timeLabel}>
            <Input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={() => setBookingPrompt(false)}>
            {withIcons(MEETING_BOOKING.cancel)}
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={update.isPending}
            disabled={!meetingDate || !meetingTime}
            onClick={confirmBooking}
          >
            {withIcons(MEETING_BOOKING.confirm)}
          </Button>
        </div>
        {update.isError && (
          <p className="text-[0.78rem] text-danger">
            {update.error instanceof Error ? update.error.message : TOASTS.actionFailed}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* One shared `outcome` mutation for all 3 buttons -- `disabled` blocks all of them while any one
          is in flight (a rep noticed, 2026-09-23: "loader spinner har button par chal rha hai"), but the
          spinner itself only shows on the specific button actually clicked (outcome.variables), same
          per-row scoping contacts-panel.tsx's Reveal/Find LinkedIn/Find Phone already use. */}
      {actions.map((o) => (
        <Button
          key={o.stage}
          variant="secondary"
          size="sm"
          loading={outcome.isPending && outcome.variables?.stage === o.stage}
          disabled={lead.pipeline_stage === o.stage || outcome.isPending}
          onClick={() => setOutcome(o)}
        >
          {o.label}
        </Button>
      ))}
      <Button
        variant="secondary"
        size="sm"
        disabled={lead.pipeline_stage === "meeting_booked" || outcome.isPending}
        onClick={() => setBookingPrompt(true)}
      >
        <Ico e="🎯" /> Meeting Booked
      </Button>
      {outcome.isError && (
        <p className="col-span-2 text-[0.78rem] text-danger">
          {outcome.error instanceof Error ? outcome.error.message : TOASTS.actionFailed}
        </p>
      )}
    </div>
  );
}

/**
 * structure-plan.md Phase 4: editing moved to Contacts entirely (Phase 2 gave it full parity with what
 * this page's old ManageDeal editor did), so a card here is read-only plus a link to go edit it. Kept
 * intentionally light -- this is a progress view, not a workbench.
 */
function PipelineSummary({ lead }: { lead: Lead }) {
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-[1rem] font-semibold"><Ico e="⚙" /> Deal</h4>
      <p className="text-[0.85rem] text-muted">
        <strong>Stage:</strong> {STAGE_LABELS[lead.pipeline_stage]}
      </p>
      <p className="text-[0.85rem] text-muted">
        <strong>Deal Value:</strong> {currency(lead.deal_value)}
      </p>
      {lead.callback_at && (
        <p className="text-[0.85rem] text-muted">
          <strong>Callback:</strong> {addedAt(lead.callback_at)}
        </p>
      )}
      {lead.meeting_at && (
        <p className="text-[0.85rem] text-muted">
          <strong>Meeting:</strong> {addedAt(lead.meeting_at)}
        </p>
      )}
      {lead.subject && (
        <p className="text-[0.82rem] text-muted">
          <strong>Subject:</strong> {lead.subject}
        </p>
      )}
      <PipelineActions lead={lead} />
      <EditLeadDialog
        lead={lead}
        trigger={
          <button type="button" className="cursor-pointer text-left text-[0.85rem] font-semibold text-accent underline">
            {withIcons(PIPELINE_CARD.editInContacts)}
          </button>
        }
      />
      {/* The "Open in Mail App" button that used to end this column now comes with the Notes panel next to
          it (NotesPanel renders its own), so it isn't shown twice on one card. */}
    </div>
  );
}

export function PipelineView({
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
  // No `stage` param any more (structure-plan.md Phase 4): the backend can't express "callback_at is
  // set OR stage is meeting_booked OR stage is contacted" as a single stage filter, so this page always
  // fetches unfiltered by stage (Category/Country still filter server-side, unchanged) and narrows the
  // rest -- including the new scope rule itself -- client-side below.
  const { data: fetchedLeads = [] } = useLeads({ category, country, q }, initialLeads);
  // Source (leadSource(), derived from source_prompt) isn't a backend column, filtered client-side same
  // as before.
  const [source, setSource] = useState(ALL_SOURCES);
  const [view, setView] = useState<"all" | "callback" | "meeting" | "email" | "proposal" | "starred">("all");
  // Date filter (user, 2026-09-23) -- "pipeline me last touched wali lead dekhyngy". updated_at, not
  // created_at: a lead already in Pipeline moved there by being worked, so "last touched" (when a
  // disposition/edit last changed it) is what's meaningful here, not when it was originally created.
  const [lastTouched, setLastTouched] = useState("");

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all" && value !== ALL_CATEGORIES && value !== ALL_COUNTRIES) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // The page's own scope: only a lead that has actually progressed lives here at all -- Callback
  // Scheduled (via callback_at OR last_call_outcome === "callback_scheduled" -- voicemail/hang_up/
  // no_answer share the same "followup_due" stage value and must NOT show here, but checking
  // last_call_outcome specifically still excludes them correctly even without callback_at), Meeting
  // Booked, Email Send ("contacted"), or (since 2026-09-22, reversing structure-plan.md Phase 7 --
  // "purposals sary hamary pass pipline me he dekhny chahiye kahin or nhi") Proposal Sent. Everything
  // else (new/drafted, or dispositioned in a way that leaves it hidden/elsewhere) simply never appears.
  //
  // The last_call_outcome half of the Callback check added 2026-09-23: a production build that never
  // successfully deployed (fixed the same day -- see docs.md "dead Follow-ups page" entries) meant several
  // Callback Scheduled dispositions went out through an old button that never asked for date/time, so
  // callback_at is null on them despite the disposition being real. User: "agar callback stage hai toh usy
  // auto add krdo pipeline me hum khudi time add krlyngy edit form sy" -- show them on Pipeline anyway so
  // a rep can fill in the real time via the edit form, rather than leaving them stranded off Pipeline
  // with no callback_at to ever match the old check.
  //
  // A callback only counts while the lead is still open: a Won or Lost lead keeps its old callback_at /
  // last_call_outcome forever, and letting that pull it back in scope listed a closed deal on Pipeline and
  // counted it twice (Opportunity AND Client Closed). Mirrored in crud/leads.py get_crm_metrics pipeline_count.
  const inScope = useMemo(
    () =>
      fetchedLeads.filter(
        (l) =>
          hasOpenCallback(l) ||
          l.pipeline_stage === "meeting_booked" ||
          l.pipeline_stage === "contacted" ||
          l.pipeline_stage === "proposal_sent",
      ),
    [fetchedLeads],
  );

  const leads = useMemo(
    () =>
      inScope.filter(
        (l) =>
          (source === ALL_SOURCES || leadSource(l.source_prompt) === source) &&
          (view === "all" ||
            (view === "callback" && hasOpenCallback(l)) ||
            (view === "meeting" && l.pipeline_stage === "meeting_booked") ||
            (view === "email" && l.pipeline_stage === "contacted") ||
            (view === "proposal" && l.pipeline_stage === "proposal_sent") ||
            (view === "starred" && Boolean(l.starred_at))) &&
          (!lastTouched || shortDate(l.updated_at) === lastTouched),
      ),
    [inScope, source, view, lastTouched],
  );

  // Two blocks (user, 2026-09-22, "pipeline me do cards add krny hain leads page ki trhn... jese
  // coldcalldesk pr pipeline show hota hai"): same MetricCard style as the Leads page's Today's/This
  // Week's Leads blocks, same "unfiltered by the page's own dropdowns" convention Cold Call Desk's ticker
  // cards use (queueValue there sums `queue`, not the further category/country/source/line-filtered
  // list) -- so these two total the page's full scope (inScope), not the narrower `leads`.
  // "Opportunity" -- every lead currently active in Pipeline that has NOT reached Proposal Sent yet (open,
  // not yet won or lost). A lead moves Opportunity -> Proposal Sent -> Client Closed and is only ever in
  // one of the three cards (user, 2026-09-25).
  const opportunityValue = inScope
    .filter((l) => l.pipeline_stage !== "proposal_sent")
    .reduce((s, l) => s + l.deal_value, 0);
  // "Client Closed" (was "Interested" until 2026-09-24, renamed on request -- it's exactly the leads at stage
  // won, the same label the Client Closed button and Projects use) -- stays 0 until a lead is actually
  // Client Closed (won leaves this page for Projects,
  // so this reads off the page's own unfiltered fetch, not inScope/leads).
  const wonValue = useMemo(
    () => fetchedLeads.filter((l) => l.pipeline_stage === "won").reduce((s, l) => s + l.deal_value, 0),
    [fetchedLeads],
  );

  // "Proposal Sent" (user, 2026-09-25: "purposal send count nhi ho rha ... jese client closed lagaya hai") --
  // the leads sitting at stage proposal_sent, value and how many. They are taken OUT of Opportunity above
  // (user: "opportunity sy minus kr do") and leave this card again once they reach Client Closed.
  // Unfiltered like the other two.
  const proposalLeads = useMemo(() => inScope.filter((l) => l.pipeline_stage === "proposal_sent"), [inScope]);
  const proposalValue = proposalLeads.reduce((s, l) => s + l.deal_value, 0);

  return (
    <>
      <div className="my-4 grid grid-cols-3 gap-4">
        <MetricCard label="Opportunity" value={currency(opportunityValue)} />
        <MetricCard
          label="Proposal Sent"
          value={currency(proposalValue)}
          sub={`${proposalLeads.length} ${proposalLeads.length === 1 ? "lead" : "leads"}`}
        />
        <MetricCard label="Client Closed" value={currency(wonValue)} />
      </div>

      <div className="mb-4 grid grid-cols-5 gap-4">
        <Field label={PIPELINE_VIEW_FILTER.label}>
          <Select value={view} onChange={(e) => setView(e.target.value as typeof view)}>
            <option value="all">{stripEmoji(PIPELINE_VIEW_FILTER.all)}</option>
            <option value="callback">{stripEmoji(PIPELINE_VIEW_FILTER.callback)}</option>
            <option value="meeting">{stripEmoji(PIPELINE_VIEW_FILTER.meeting)}</option>
            <option value="email">{stripEmoji(PIPELINE_VIEW_FILTER.email)}</option>
            <option value="proposal">{stripEmoji(PIPELINE_VIEW_FILTER.proposal)}</option>
            <option value="starred">{stripEmoji(PIPELINE_VIEW_FILTER.starred)}</option>
          </Select>
        </Field>
        <Field label="Category Filter">
          <Select value={category} onChange={(e) => setParam("category", e.target.value)}>
            <option value={ALL_CATEGORIES}>{stripEmoji(ALL_CATEGORIES)}</option>
            {STANDARD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {stripEmoji(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Country Filter">
          <Select value={country} onChange={(e) => setParam("country", e.target.value)}>
            <option value={ALL_COUNTRIES}>{stripEmoji(ALL_COUNTRIES)}</option>
            <option value={UNKNOWN_COUNTRY}>Unknown</option>
            {COUNTRIES.map((c) => (
              <option key={c.id} value={c.id}>
                {stripEmoji(c.label)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Source Filter">
          <Select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value={ALL_SOURCES}>{stripEmoji(ALL_SOURCES)}</option>
            {Object.entries(LEAD_SOURCE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {stripEmoji(label)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Last Activity">
          <Input type="date" value={lastTouched} onChange={(e) => setLastTouched(e.target.value)} />
        </Field>
      </div>

      {leads.length === 0 && <p className="text-muted">{withIcons(EMPTY_STATES.pipeline)}</p>}

      {leads.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          summary={
            <span className="text-[0.95rem]">
              <Ico e="💼" /> <strong>{lead.company_name}</strong>
              <span className="text-muted">
                {" "}
                — {currency(lead.deal_value)} · <CategoryLabel value={lead.industry_tag} /> (
                {STAGE_LABELS[lead.pipeline_stage]})
              </span>
              {lead.callback_at ? (
                <span className="ml-2 rounded-[6px] bg-input px-1.5 py-0.5 text-[0.75rem] font-semibold text-muted">
                  {withIcons(PIPELINE_CARD.callbackTag(
                    new Date(lead.callback_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  ))}
                </span>
              ) : (
                lead.last_call_outcome === "callback_scheduled" && (
                  <span
                    className="ml-2 rounded-[6px] px-1.5 py-0.5 text-[0.75rem] font-semibold"
                    style={{ background: "var(--warn-tint)", color: "var(--warn)" }}
                    title="Callback Scheduled, but no date/time was captured -- set one via Edit."
                  >
                    {withIcons(PIPELINE_CARD.callbackNoTimeTag)}
                  </span>
                )
              )}
              {lead.pipeline_stage === "meeting_booked" && lead.meeting_at && (
                <span className="ml-2 rounded-[6px] bg-input px-1.5 py-0.5 text-[0.75rem] font-semibold text-muted">
                  {withIcons(PIPELINE_CARD.meetingTag(
                    new Date(lead.meeting_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  ))}
                </span>
              )}
              {lead.pipeline_stage === "proposal_sent" && (
                <span className="ml-2 rounded-[6px] bg-input px-1.5 py-0.5 text-[0.75rem] font-semibold text-muted">
                  {withIcons(PIPELINE_CARD.proposalTag)}
                </span>
              )}
              {/* Ali (Sales Rep, 2026-09-15): leads couldn't be verified
                  without knowing when/how they were added. */}
              <span className="ml-2 text-[0.75rem] text-muted">
                <Ico e="🕒" /> {addedAt(lead.created_at)} · {withIcons(LEAD_SOURCE_LABELS[leadSource(lead.source_prompt)])}
                <LeadWho lead={lead} />
              </span>
            </span>
          }
        >
          {/* Three columns: company/contact | deal + actions | notes. Notes added 2026-09-24 ("yeh notes
              pipeline me nhi dikh rhy") -- the same NotesPanel Leads/Projects/the Meeting popup already use. */}
          <div className="grid grid-cols-[1.4fr_1fr_1.2fr] gap-6">
            <div className="flex flex-col gap-3">
              <h4 className="text-[1rem] font-semibold"><Ico e="🏢" /> Company &amp; Contact</h4>
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
              <p className="text-[0.85rem]"><Ico e="👤" /> {lead.contact_name || "—"}</p>
              {hasUsableEmail(lead.contact_email) && (
                <p className="text-[1rem] font-medium text-text"><Ico e="✉" /> {lead.contact_email}</p>
              )}
              {lead.contact_phone && <PhoneNumberList phones={lead.contact_phone} />}

              <LinkedInResearchPanel lead={lead} />
              <HunterDecisionMakers lead={lead} />
              <SiteScanPanel lead={lead} />

              <p className="text-[0.82rem] text-muted">
                <strong>Category:</strong> <CategoryLabel value={lead.industry_tag} />
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

            <PipelineSummary lead={lead} />

            <NotesPanel lead={lead} />
          </div>
        </LeadCard>
      ))}
    </>
  );
}
