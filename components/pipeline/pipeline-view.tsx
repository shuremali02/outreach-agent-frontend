"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useAddNote, useBookFollowupMeeting, useCallOutcome, useLeads, useMeetingOutcome } from "@/hooks/use-leads";
import { EmailPickerDialog } from "@/components/leads/email-picker-dialog";
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
import { Select, Field, Input, Textarea } from "@/components/ui/input";
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
  NOT_INTERESTED_NOTE,
  EMAIL_SEND,
  FOLLOWUP_MEETING,
  FOLLOWUP_MEETING_STAGES,
  TOASTS,
  countryLabel,
} from "@/lib/constants";
import { addedAt, currency, externalUrl, displayDomain, hasUsableEmail, leadSource, shortDate } from "@/lib/format";
import type { Lead } from "@/types";
import { EMPTY_STATES } from "@/lib/constants";
import { CategoryLabel, CountryFlag, Ico, stripEmoji, withIcons } from "@/components/ui/emoji-icon";
import { AttemptTracker } from "@/components/pipeline/attempt-tracker";
import { FollowupTracker, isFollowupEscalated } from "@/components/pipeline/followup-tracker";
import { ProposalReminderPrompt } from "@/components/pipeline/proposal-reminder-prompt";
import { NoShowReminderPrompt } from "@/components/pipeline/no-show-reminder-prompt";

/**
 * Has a callback (a set time, or a Callback Scheduled disposition) that's still OPEN -- gated on
 * `pipeline_stage === "followup_due"` (2026-10-27 correction, user: "jab stage change ho gaya hai ab
 * callback_at nahi rahega, ab jis stage pr hai us k according rahegi ... stage to aage barh gaya hai na"
 * -- live report on "All Terrain Campers Inc.", a Callback-Scheduled lead whose stage correctly moved to
 * "meeting_booked" still looked like it belonged on the Callbacks tab). "followup_due" is the ONLY stage
 * a callback-scheduled lead is ever at (_OUTCOME_STAGE/set_meeting_outcome()'s "Callback" button both
 * only ever land it there) -- the moment ANY real disposition moves pipeline_stage past that (Meeting
 * Booked, Proposal Sent, Won, Lost, ...), the callback has been resolved by definition, regardless of
 * callback_at's own stale value. Previously only excluded won/lost explicitly; this is the same rule,
 * just stated the right way round -- no backend/data change needed, callback_at itself is left alone as
 * a historical record.
 */
function hasOpenCallback(l: Lead): boolean {
  return (
    l.pipeline_stage === "followup_due" &&
    (Boolean(l.callback_at) || l.last_call_outcome === "callback_scheduled")
  );
}

// "callback" REMOVED 2026-10-16 -- moved to the per-slot system (callback_slots), see isAnySlotEscalated
// below. no_show/proposal still use the old auto-computed-due escalation unchanged.
type AttemptContext = "no_show" | "proposal";

/**
 * This card's attempt-tracker status, if it has recorded at least one attempt -- not just whether it's
 * OVERDUE. User, 2026-10-15, after the overdue-only badge shipped: "agar mujhy callback wala filter
 * select kr k dekhna hai k Second Attempt kis ko krna hai toh woh kese dekh skunga" -- selecting the
 * existing "Callbacks" view and scanning for who's on attempt 2 vs. still on attempt 1 had no answer
 * without opening every card. Returns null only when NO attempt has been checked yet for this lead's
 * context (nothing to show -- same as before this request). `attempt` is always attempts.length + 1,
 * i.e. the NEXT attempt still to do, 2 or 3 (next_attempt_due only exists once attempt 1 has happened;
 * once all 3 are used, `due` is null and `attempt` reports 3 to mean "all attempts used").
 */
function attemptStatus(
  lead: Lead,
): { context: AttemptContext; attempt: number; due: string; overdue: boolean } | null {
  let context: AttemptContext | null = null;
  if (lead.pipeline_stage === "proposal_sent") context = "proposal";
  else if (lead.pipeline_stage === "followup_due" && lead.no_show_at) context = "no_show";
  if (!context) return null;

  const attempts = context === "no_show" ? lead.no_show_attempts : lead.proposal_attempts;
  if (attempts.length === 0) return null;
  const due = context === "no_show" ? lead.no_show_next_attempt_due : lead.proposal_next_attempt_due;
  const overdue = Boolean(due) && new Date(due).getTime() <= Date.now();
  return { context, attempt: Math.min(attempts.length + 1, 3), due, overdue };
}

/** Mirrors the backend's own scope + due check (crud/attempt_reminders.py _scoped_leads /
 * next_attempt_due) so the "Attempts Due" filter and the notification that already fired for the same
 * lead never disagree about what's genuinely overdue. */
function overdueAttemptContext(lead: Lead): AttemptContext | null {
  const status = attemptStatus(lead);
  return status?.overdue ? status.context : null;
}

/** Whether ANY of this lead's Email/Call Attempt or Callback slots is escalated (1h past its scheduled
 * time, still not marked attempted) -- user, 2026-10-16: "woh red ho jaye lead ... 1 ghnty bad". Matches
 * the backend's own escalation threshold exactly (crud/attempt_reminders.py
 * check_and_fire_slot_reminders()). Drives the Pipeline card's red accent AND (for "callback" specifically)
 * the Callbacks page's own "Overdue" stat tile. */
function isAnySlotEscalated(lead: Lead): boolean {
  return (
    isFollowupEscalated(lead.email_followup_slots) ||
    isFollowupEscalated(lead.call_followup_slots) ||
    isFollowupEscalated(lead.callback_slots) ||
    isFollowupEscalated(lead.no_show_email_followup_slots) ||
    isFollowupEscalated(lead.no_show_call_followup_slots)
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
  // First-time "Meeting Booked" (below, in confirmBooking()) goes through the SAME call-outcome endpoint
  // Cold Call Desk's battlecard uses (useCallOutcome -> apply_call_outcome), not a plain PATCH (2026-10-29
  // bugfix -- user: "agar callbacks tab sy ya kahin sy meeting booked hoti hai woh meetings me count nhi
  // hoti today me"). A raw field update never touched app/crud/call_events.py, which is what Today/
  // This-Week's "Meetings" stat actually counts (_count_outcomes(... ("meeting_booked",))) -- so a meeting
  // booked from the Callbacks tab, or anywhere else via this shared PipelineActions component, silently
  // never counted, even though the lead itself correctly showed up on the Meetings calendar.
  const callOutcome = useCallOutcome();
  const bookFollowup = useBookFollowupMeeting();
  const addNote = useAddNote();
  // A lead already past its first meeting (user, 2026-10-23: client wanted another meeting before the
  // deal closed, after an earlier one already moved the lead to Proposal Sent) -- the "🎯 Meeting
  // Booked" button below becomes "Book Another Meeting" for these and keeps pipeline_stage as-is
  // instead of reverting it to "meeting_booked". See app/crud/leads.py book_followup_meeting().
  const isFollowupMeeting = (FOLLOWUP_MEETING_STAGES as readonly string[]).includes(lead.pipeline_stage);
  const confirm = useConfirm();
  const toast = useToast();
  const [bookingPrompt, setBookingPrompt] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  // Not Interested's mandatory note (user, 2026-10-16: "jab woh not intrested mark kry tab woh neechy note
  // puchy k ... tb tk agy na jany dya jaye jb tk woh note add na kr dy k kyun not intrested" -- e.g. Ali
  // marking it after 6 followup attempts should have to say why). Only "lost" uses this prompt; Client
  // Closed/Proposal Send keep the plain confirm() dialog below, unchanged.
  const [notInterestedPrompt, setNotInterestedPrompt] = useState(false);
  const [notInterestedNote, setNotInterestedNote] = useState("");
  // Proposal Send's blocking reminder gate (user, 2026-10-16: "jese he purposal send button click hon
  // whn pehle woh reminder set ka puche... jab tk banda set na kry time tb tk agy nhi jayegi lead
  // pipeline me") -- see components/pipeline/proposal-reminder-prompt.tsx. The stage change itself
  // happens in onProposalScheduled below, only once the reminder is saved.
  const [proposalPrompt, setProposalPrompt] = useState(false);
  // No Show's own blocking reminder gate (user, 2026-10-19: "humny jo system proposal button pr lgaya
  // hai same woh no show pr bhi lagega") -- identical mechanism, see onNoShowScheduled below.
  const [noShowPrompt, setNoShowPrompt] = useState(false);
  const noShowOutcome = MEETING_OUTCOMES.find((o) => o.noShow)!;

  // Not Interested / Proposal Send / Client Closed -- the same 3 (of 4) MEETING_OUTCOMES entries the
  // Meetings detail popup uses, minus "Needs Follow-up" (a post-meeting-only concept that doesn't apply
  // to a lead that may not have had a meeting yet). No Show (also stage "followup_due") gets its own
  // dedicated button below instead of going through this generic confirm-dialog loop -- unlike the other
  // three, it's never disabled just because the lead is already at followup_due (a plain reschedule is a
  // different thing), and it needs the reminder gate, not a plain confirm().
  const actions = MEETING_OUTCOMES.filter((o) => o.stage !== "followup_due");

  async function setOutcome(o: (typeof actions)[number]) {
    if (o.stage === "lost") {
      setNotInterestedNote("");
      setNotInterestedPrompt(true);
      return;
    }
    if (o.stage === "proposal_sent") {
      setProposalPrompt(true);
      return;
    }
    const ok = await confirm({
      title: o.confirmTitle(lead.company_name),
      description: o.confirmBody,
      confirmLabel: o.confirmLabel,
      tone: "default",
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

  function confirmNotInterested() {
    const text = notInterestedNote.trim();
    if (!text) return;
    const lostOutcome = MEETING_OUTCOMES.find((o) => o.stage === "lost")!;
    addNote.mutate(
      { id: lead.id, text },
      {
        onSuccess: () =>
          outcome.mutate(
            { id: lead.id, stage: "lost" },
            {
              onSuccess: () => {
                toast.success(lostOutcome.done(lead.company_name));
                setNotInterestedPrompt(false);
                setNotInterestedNote("");
              },
              onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
            },
          ),
        onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
      },
    );
  }

  function onProposalScheduled() {
    const proposalOutcome = MEETING_OUTCOMES.find((o) => o.stage === "proposal_sent")!;
    outcome.mutate(
      { id: lead.id, stage: "proposal_sent" },
      {
        onSuccess: () => {
          toast.success(proposalOutcome.done(lead.company_name));
          setProposalPrompt(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
      },
    );
  }

  function onNoShowScheduled() {
    outcome.mutate(
      { id: lead.id, stage: "followup_due", noShow: true },
      {
        onSuccess: () => {
          toast.success(noShowOutcome.done(lead.company_name));
          setNoShowPrompt(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
      },
    );
  }

  function confirmBooking() {
    if (!meetingDate || !meetingTime) return;
    const meetingAt = `${meetingDate}T${meetingTime}:00`;
    if (isFollowupMeeting) {
      bookFollowup.mutate(
        { id: lead.id, meetingAt },
        {
          onSuccess: () => {
            toast.success(FOLLOWUP_MEETING.booked(lead.company_name));
            setBookingPrompt(false);
            setMeetingDate("");
            setMeetingTime("");
          },
          onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
        },
      );
      return;
    }
    callOutcome.mutate(
      { id: lead.id, outcome: "meeting_booked", meetingAt },
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

  if (notInterestedPrompt) {
    return (
      <div className="flex flex-col gap-2 rounded-[8px] border border-danger bg-input px-3 py-3">
        <p className="text-[0.85rem] font-semibold">{withIcons(NOT_INTERESTED_NOTE.prompt)}</p>
        <Textarea
          rows={3}
          value={notInterestedNote}
          onChange={(e) => setNotInterestedNote(e.target.value)}
          placeholder={NOT_INTERESTED_NOTE.placeholder}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={() => setNotInterestedPrompt(false)}>
            {withIcons(MEETING_BOOKING.cancel)}
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={addNote.isPending || outcome.isPending}
            disabled={!notInterestedNote.trim()}
            onClick={confirmNotInterested}
          >
            {withIcons(NOT_INTERESTED_NOTE.confirm)}
          </Button>
        </div>
        {(addNote.isError || outcome.isError) && (
          <p className="text-[0.78rem] text-danger">
            {(addNote.error || outcome.error) instanceof Error
              ? ((addNote.error || outcome.error) as Error).message
              : TOASTS.actionFailed}
          </p>
        )}
      </div>
    );
  }

  if (proposalPrompt) {
    return (
      <ProposalReminderPrompt
        lead={lead}
        onConfirm={onProposalScheduled}
        onCancel={() => setProposalPrompt(false)}
        pending={outcome.isPending}
      />
    );
  }

  if (noShowPrompt) {
    return (
      <NoShowReminderPrompt
        lead={lead}
        onConfirm={onNoShowScheduled}
        onCancel={() => setNoShowPrompt(false)}
        pending={outcome.isPending}
      />
    );
  }

  if (bookingPrompt) {
    return (
      <div className="flex flex-col gap-2 rounded-[8px] border border-accent bg-input px-3 py-3">
        <p className="text-[0.85rem] font-semibold">{withIcons(MEETING_BOOKING.prompt)}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label={MEETING_BOOKING.dateLabel}>
            <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
          </Field>
          <Field label={MEETING_BOOKING.timeLabel}>
            <Input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={() => setBookingPrompt(false)}>
            {withIcons(MEETING_BOOKING.cancel)}
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={callOutcome.isPending || bookFollowup.isPending}
            disabled={!meetingDate || !meetingTime}
            onClick={confirmBooking}
          >
            {withIcons(MEETING_BOOKING.confirm)}
          </Button>
        </div>
        {(callOutcome.isError || bookFollowup.isError) && (
          <p className="text-[0.78rem] text-danger">
            {(callOutcome.error || bookFollowup.error) instanceof Error
              ? ((callOutcome.error || bookFollowup.error) as Error).message
              : TOASTS.actionFailed}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
        {isFollowupMeeting ? (
          <><Ico e="📅" /> {FOLLOWUP_MEETING.buttonLabel}</>
        ) : (
          <><Ico e="🎯" /> Meeting Booked</>
        )}
      </Button>
      {/* "No Show" (user, 2026-10-19: "yahan pr no show bhi add krdo jo mark hai 5 buttons k sath") --
          its own button, not routed through the generic `actions.map()` loop above: unlike those three,
          it's never disabled just for already being at followup_due (a plain reschedule is a different,
          distinct action), and it needs the reminder gate instead of a plain confirm(). */}
      <Button variant="secondary" size="sm" disabled={outcome.isPending} onClick={() => setNoShowPrompt(true)}>
        {noShowOutcome.label}
      </Button>
      {/* "Email Send" here too (user, 2026-09-29: "callback wali leads ka status email send bhi ho skta
          hai, yeh button bhi rakh do") -- same picker dialog Cold Call Desk and the Meetings popup use.
          REPURPOSED 2026-10-21: opens an address-picker, moves the lead to the manual Email desk --
          see components/leads/email-picker-dialog.tsx. Disabled once already active there instead of the
          old `pipeline_stage === "contacted"` check (that stage is no longer touched by this button). */}
      <EmailPickerDialog
        lead={lead}
        trigger={
          <Button
            variant="secondary"
            size="sm"
            title={lead.email_desk_sent_at ? EMAIL_SEND.disabledHelp : EMAIL_SEND.help}
            disabled={Boolean(lead.email_desk_sent_at)}
          >
            {withIcons(EMAIL_SEND.button)}
          </Button>
        }
      />
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
export function PipelineSummary({ lead }: { lead: Lead }) {
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
      {/* Action buttons moved above the attempt/reminder trackers (user, 2026-10-19: "yeh action buttons
          opr hon or is k neechy woh attempts wala seen show ho sara"). */}
      <PipelineActions lead={lead} />
      {/* 3-checkbox re-contact tracker (user request, 2026-09-29) -- exactly one of these two ever
          matches a given card, same conditions the card's own header tag above already uses. "callback"
          moved to FollowupTracker (per-slot, 2026-10-16) -- see the followup-tracker.tsx doc comment. */}
      {lead.pipeline_stage === "followup_due" && lead.no_show_at ? (
        <>
          <AttemptTracker lead={lead} context="no_show" />
          {/* ADDITIVE, not a replacement (user, 2026-10-19: "humny jo system proposal button pr lgaya
              hai same woh no show pr bhi lagega") -- same pattern as proposal_sent below. */}
          <FollowupTracker lead={lead} context="no_show_email_followup" />
          <FollowupTracker lead={lead} context="no_show_call_followup" />
        </>
      ) : (
        hasOpenCallback(lead) && <FollowupTracker lead={lead} context="callback" />
      )}
      {lead.pipeline_stage === "proposal_sent" && (
        <>
          {/* Dimmed + locked (user, 2026-10-21): this tracker's own auto-computed due date was firing a
              SEPARATE notification on top of the Email/Call Attempt reminders below, which the rep sets
              manually ("mixup ho rha... humyn woh reminders miss nhi krny jo manual lagaye ja rhy
              hein") -- see attempt-tracker.tsx's `disabled` prop doc for the full reasoning. History
              stays visible; nothing here is actionable or notifies anymore for Proposal Sent leads. */}
          <AttemptTracker lead={lead} context="proposal" disabled />
          <FollowupTracker lead={lead} context="email_followup" />
          <FollowupTracker lead={lead} context="call_followup" />
        </>
      )}
      {/* "Edit in Leads" moved to the card's top-right header (user, 2026-10-16) -- see the <LeadCard>
          summary below; this column no longer renders it. */}
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
  scope = "pipeline",
}: {
  initialLeads: Lead[];
  category: string;
  country: string;
  q: string;
  /** "callbacks" (new page, user 2026-10-15: "callback ka ek apna alag seprate tab ho... Golden leads k
   * sath mixup ho rha hai") scopes this SAME component to only callback-scheduled leads instead of
   * Pipeline's usual Opportunity/Proposal Sent/Meeting Booked/Email Send -- the two scopes are mutually
   * exclusive (a lead with an open callback no longer shows on Pipeline at all), reusing every other
   * piece of this page (cards, filters, actions) rather than forking a near-duplicate file. */
  scope?: "pipeline" | "callbacks";
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
  const [view, setView] = useState<
    "all" | "meeting" | "email" | "proposal" | "noShow" | "starred" | "attempts_due"
  >("all");
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
  //
  // scope === "callbacks" (2026-10-15): the two scopes are mutually exclusive -- a lead with an open
  // callback shows HERE ONLY, never mixed in with Pipeline's Opportunity/Proposal/Meeting/Email cards.
  const inScope = useMemo(
    () =>
      fetchedLeads.filter((l) =>
        scope === "callbacks"
          ? hasOpenCallback(l)
          : l.pipeline_stage === "meeting_booked" ||
            l.pipeline_stage === "contacted" ||
            l.pipeline_stage === "proposal_sent" ||
            // No Show leads (2026-10-19, user: "no show waly bhi pipeline me dekhyngy") -- previously
            // excluded, only ever shown on the Meetings page's "Needs Follow-up" list.
            (l.pipeline_stage === "followup_due" && Boolean(l.no_show_at)),
      ),
    [fetchedLeads, scope],
  );

  const leads = useMemo(
    () =>
      inScope.filter(
        (l) =>
          (source === ALL_SOURCES || leadSource(l.source_prompt) === source) &&
          (view === "all" ||
            (view === "meeting" && l.pipeline_stage === "meeting_booked") ||
            (view === "email" && l.pipeline_stage === "contacted") ||
            (view === "proposal" && l.pipeline_stage === "proposal_sent") ||
            (view === "noShow" && l.pipeline_stage === "followup_due" && Boolean(l.no_show_at)) ||
            (view === "starred" && Boolean(l.starred_at)) ||
            (view === "attempts_due" && overdueAttemptContext(l) !== null)) &&
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
  // No Show leads (2026-10-19) are excluded here too, same reasoning as Proposal Sent -- they're a
  // distinct re-attempt bucket, not an open-in-progress opportunity, and get their own filter/count.
  const opportunityLeads = useMemo(
    () =>
      inScope.filter(
        (l) => l.pipeline_stage !== "proposal_sent" && !(l.pipeline_stage === "followup_due" && l.no_show_at),
      ),
    [inScope],
  );
  const opportunityValue = opportunityLeads.reduce((s, l) => s + l.deal_value, 0);
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

  // Callbacks page's own stat row (2026-10-15) -- same "unfiltered by the page's own dropdowns"
  // convention as the Pipeline tiles above. `inScope` here is already callback-only (see inScope above).
  const callbackValue = useMemo(() => inScope.reduce((s, l) => s + l.deal_value, 0), [inScope]);
  // 2026-10-16: was overdueAttemptContext() (the old callback escalation); "callback" moved to the
  // per-slot system, so this now reads callback_slots directly.
  const overdueCallbacks = useMemo(
    () => inScope.filter((l) => isFollowupEscalated(l.callback_slots)).length,
    [inScope],
  );

  return (
    <>
      {scope === "callbacks" ? (
        <div className="my-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MetricCard
            label="Callbacks Scheduled"
            value={currency(callbackValue)}
            sub={`${inScope.length} ${inScope.length === 1 ? "lead" : "leads"}`}
          />
          <MetricCard
            label="Overdue"
            value={String(overdueCallbacks)}
            accent={overdueCallbacks > 0 ? "danger" : undefined}
          />
        </div>
      ) : (
        <div className="my-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Opportunity"
            value={currency(opportunityValue)}
            sub={`${opportunityLeads.length} ${opportunityLeads.length === 1 ? "lead" : "leads"}`}
          />
          <MetricCard
            label="Proposal Sent"
            value={currency(proposalValue)}
            sub={`${proposalLeads.length} ${proposalLeads.length === 1 ? "lead" : "leads"}`}
          />
          <MetricCard label="Client Closed" value={currency(wonValue)} />
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label={PIPELINE_VIEW_FILTER.label}>
          <Select value={view} onChange={(e) => setView(e.target.value as typeof view)}>
            <option value="all">{stripEmoji(PIPELINE_VIEW_FILTER.all)}</option>
            {scope === "pipeline" && (
              <>
                <option value="meeting">{stripEmoji(PIPELINE_VIEW_FILTER.meeting)}</option>
                <option value="email">{stripEmoji(PIPELINE_VIEW_FILTER.email)}</option>
                <option value="proposal">{stripEmoji(PIPELINE_VIEW_FILTER.proposal)}</option>
                <option value="noShow">{stripEmoji(PIPELINE_VIEW_FILTER.noShow)}</option>
              </>
            )}
            <option value="starred">{stripEmoji(PIPELINE_VIEW_FILTER.starred)}</option>
            <option value="attempts_due">{stripEmoji(PIPELINE_VIEW_FILTER.attemptsDue)}</option>
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

      {leads.length === 0 && (
        <p className="text-muted">{withIcons(scope === "callbacks" ? EMPTY_STATES.callbacks : EMPTY_STATES.pipeline)}</p>
      )}

      {leads.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          accent={isAnySlotEscalated(lead) ? "danger" : undefined}
          headerAction={
            <EditLeadDialog
              lead={lead}
              trigger={
                <button
                  type="button"
                  className="cursor-pointer text-[0.82rem] font-semibold text-accent underline"
                >
                  {withIcons(PIPELINE_CARD.editInContacts)}
                </button>
              }
            />
          }
          summary={
            <span className="text-[0.95rem]">
              <Ico e="💼" /> <strong>{lead.company_name}</strong>
              <span className="text-muted">
                {" "}
                — {currency(lead.deal_value)} · <CategoryLabel value={lead.industry_tag} /> (
                {STAGE_LABELS[lead.pipeline_stage]})
              </span>
              {/* All the badges + the added-at line, grouped so they always wrap together as a unit
                  instead of being loose inline text: on a phone, a long company name alone could push
                  these onto a wrapped line in the middle of nowhere, interleaved unpredictably with
                  whichever badges happened to apply to that lead (same root cause fixed in
                  needs-followup-list.tsx, 2026-10-03). `flex flex-wrap gap-2` below `sm` gives every
                  card the same shape (text, then badges on their own row); `sm:inline` + each child's
                  `sm:ml-2` restores today's exact inline-at-the-end-of-the-line look. */}
              <span className="mt-1 flex flex-wrap items-center gap-1.5 sm:mt-0 sm:inline sm:gap-0">
                {lead.callback_at ? (
                  <span className="rounded-[6px] bg-input px-1.5 py-0.5 text-[0.75rem] font-semibold text-muted sm:ml-2">
                    {withIcons(PIPELINE_CARD.callbackTag(
                      new Date(lead.callback_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    ))}
                  </span>
                ) : (
                  lead.last_call_outcome === "callback_scheduled" && (
                    <span
                      className="rounded-[6px] px-1.5 py-0.5 text-[0.75rem] font-semibold sm:ml-2"
                      style={{ background: "var(--warn-tint)", color: "var(--warn)" }}
                      title="Callback Scheduled, but no date/time was captured -- set one via Edit."
                    >
                      {withIcons(PIPELINE_CARD.callbackNoTimeTag)}
                    </span>
                  )
                )}
                {lead.pipeline_stage === "meeting_booked" && lead.meeting_at && (
                  <span className="rounded-[6px] bg-input px-1.5 py-0.5 text-[0.75rem] font-semibold text-muted sm:ml-2">
                    {withIcons(PIPELINE_CARD.meetingTag(
                      new Date(lead.meeting_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    ))}
                  </span>
                )}
                {lead.pipeline_stage === "proposal_sent" && (
                  <span className="rounded-[6px] bg-input px-1.5 py-0.5 text-[0.75rem] font-semibold text-muted sm:ml-2">
                    {withIcons(PIPELINE_CARD.proposalTag)}
                  </span>
                )}
                {lead.pipeline_stage === "followup_due" && lead.no_show_at && (
                  <span
                    className="rounded-[6px] px-1.5 py-0.5 text-[0.75rem] font-semibold sm:ml-2"
                    style={{ background: "var(--danger-tint)", color: "var(--danger)" }}
                  >
                    {withIcons(
                      PIPELINE_CARD.noShowTag(
                        new Date(lead.no_show_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                      ),
                    )}
                  </span>
                )}
                {/* At-a-glance attempt-stage badge (user, 2026-10-15: first "ek ek lead pr mark dekh kr
                    pata lagana prhta ha", then after the overdue-only version shipped: "callback wala
                    filter select kr k dekhna hai k Second Attempt kis ko krna hai toh woh kese dekh
                    skunga" -- selecting the existing Callbacks/etc. view and scanning for who's on
                    attempt 2 vs. still on 1 needs this to show even when NOT yet overdue, not only once
                    it's late. Danger color once overdue (same as before), warn while still upcoming, so
                    the one badge covers both questions -- "is this late" and "which attempt is next". */}
                {(() => {
                  const status = attemptStatus(lead);
                  if (!status) return null;
                  const label = status.overdue
                    ? PIPELINE_CARD.attemptOverdueTag(status.attempt)
                    : status.attempt >= 3 && !status.due
                      ? PIPELINE_CARD.attemptAllUsedTag
                      : PIPELINE_CARD.attemptUpcomingTag(status.attempt, addedAt(status.due));
                  // Dimmed to neutral/muted for "proposal" (user, 2026-10-21, same request as the
                  // AttemptTracker `disabled` prop above): this badge is the same auto-tracker, now
                  // superseded by the rep's own manually-scheduled Email/Call Attempt reminders for
                  // Proposal Sent leads -- kept visible as a quiet at-a-glance marker, no longer colored
                  // as an alert so it can't be mistaken for one of the manual reminders. "no_show" is
                  // untouched (not part of this request).
                  const muted = status.context === "proposal";
                  return (
                    <span
                      className="rounded-[6px] px-1.5 py-0.5 text-[0.75rem] font-semibold sm:ml-2"
                      style={
                        muted
                          ? { background: "var(--input)", color: "var(--muted)" }
                          : {
                              background: status.overdue ? "var(--danger-tint)" : "var(--warn-tint)",
                              color: status.overdue ? "var(--danger)" : "var(--warn)",
                            }
                      }
                    >
                      {withIcons(label)}
                    </span>
                  );
                })()}
                {/* Ali (Sales Rep, 2026-09-15): leads couldn't be verified
                    without knowing when/how they were added. */}
                <span className="text-[0.75rem] text-muted sm:ml-2">
                  <Ico e="🕒" /> {addedAt(lead.created_at)} · {withIcons(LEAD_SOURCE_LABELS[leadSource(lead.source_prompt)])}
                  <LeadWho lead={lead} />
                </span>
              </span>
            </span>
          }
        >
          {/* Three columns: company/contact | deal + actions | notes. Notes added 2026-09-24 ("yeh notes
              pipeline me nhi dikh rhy") -- the same NotesPanel Leads/Projects/the Meeting popup already use. */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr_1.2fr]">
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
                <strong>Country:</strong>{" "}
                {lead.country ? (
                  <>
                    <CountryFlag code={lead.country} /> {countryLabel(lead.country)}
                  </>
                ) : (
                  "Not specified"
                )}
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
