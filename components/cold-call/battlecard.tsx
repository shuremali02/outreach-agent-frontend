"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUpdateLead, useCallOutcome, useAddNote, useCallPickedBy, useNeedsEmail } from "@/hooks/use-leads";
import { LinkedInResearchPanel, HunterDecisionMakers, SiteScanPanel } from "@/components/enrichment";
import { LeadCard } from "@/components/leads/lead-card";
import { LeadWho } from "@/components/leads/lead-who";
import { LocalTimeBadge } from "@/components/leads/local-time-badge";
import { PhoneBadge } from "@/components/leads/phone-badge";
import { PhoneNumberList } from "@/components/leads/phone-number-list";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Input, Field } from "@/components/ui/input";
import { EditLeadDialog } from "@/components/leads/edit-lead-dialog";
import { MentionField } from "@/components/common/mention-field";
import { useUsers } from "@/hooks/use-users";
import { extractMentions } from "@/lib/mentions";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { enrichmentApi, leadsApi } from "@/lib/api";
import {
  addedAt, currency, externalUrl, hasUsableEmail, leadSource, mailtoUrl,
  linkedInXrayUrl,
} from "@/lib/format";
import {
  BATTLECARD,
  CLOSING_DISPOSITIONS,
  MENTIONS,
  DISPOSITIONS,
  CALL_PICKED_BY,
  CALLBACK_BOOKING,
  EMAIL_SEND,
  LAST_TOUCH,
  FALLBACK_OBJECTIONS,
  LEAD_SOURCE_LABELS,
  MEETING_BOOKING,
  TOASTS,
  countryLabel,
  fallbackScript,
} from "@/lib/constants";
import type { CallOutcome, Lead } from "@/types";

/** app.py:1874-1881 — the template used when phone_script is missing or < 15 chars. */
function scriptFor(lead: Lead): string {
  if (lead.phone_script && lead.phone_script.length >= 15) return lead.phone_script;
  const first = (lead.contact_name || "there").split(" ")[0];
  return fallbackScript(first, lead.company_name);
}

function EditContact({ lead }: { lead: Lead }) {
  const update = useUpdateLead();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(lead.contact_phone);
  const [linkedin, setLinkedin] = useState(lead.contact_linkedin);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer text-[0.8rem] font-semibold text-muted hover:text-accent"
      >
        {BATTLECARD.editContact}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          <Field label={BATTLECARD.phoneLabel}>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={BATTLECARD.phonePlaceholder}
            />
          </Field>
          <Field label={BATTLECARD.linkedInLabel}>
            <Input
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder={BATTLECARD.linkedInPlaceholder}
            />
          </Field>
          <Button
            variant="secondary"
            size="sm"
            loading={update.isPending}
            onClick={() =>
              update.mutate(
                {
                  id: lead.id,
                  input: { contact_phone: phone, contact_linkedin: linkedin },
                },
                {
                  onSuccess: () => toast.success(TOASTS.saved(lead.company_name)),
                  onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
                },
              )
            }
          >
            {BATTLECARD.saveContact}
          </Button>
          {update.isError && (
            <p className="text-[0.78rem] text-danger">
              {update.error instanceof Error ? update.error.message : "Failed to save contact info. Try again."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function Battlecard({
  lead,
  onActionTaken,
}: {
  lead: Lead;
  /** Called right after any disposition succeeds -- see ColdCallView's
   * `dismiss`, which hides this lead from the queue immediately so a rep
   * gets clear feedback the click registered instead of the card just
   * sitting there unchanged. */
  onActionTaken?: (leadId: number) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const record = useCallOutcome();
  const callPickedBy = useCallPickedBy();
  const needsEmail = useNeedsEmail();
  const generate = useMutation({
    mutationFn: () => enrichmentApi.generateBattlecard(lead.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success(TOASTS.battlecardReady(lead.company_name));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
  });
  // "Open in Mail App" only opens a mailto: link -- no send confirmation
  // reaches the backend, so this is a separate, explicit, rep-confirmed
  // record (feeds the Today page's Emails count, call_events.py).
  const [emailMarked, setEmailMarked] = useState(false);
  const markEmailSent = useMutation({
    mutationFn: () => leadsApi.markEmailSent(lead.id),
    onSuccess: () => {
      setEmailMarked(true);
      toast.success(TOASTS.emailMarked(lead.company_name));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
  });
  const [note, setNote] = useState("");
  const { data: users = [] } = useUsers();
  // The note field only ever got saved bundled with a disposition (Voicemail/
  // Dead Line/etc.) -- there was no way to log what was actually said mid-
  // call without also ending the call with a specific outcome. This appends
  // it independently, right now, same append-only mechanism Contacts'
  // "➕ Add Note" uses (crud/leads.py add_note()) -- so the next rep who
  // opens this lead can see what the previous call covered even if this one
  // doesn't get disposed with a note attached.
  const addNote = useAddNote();
  const [objectionsOpen, setObjectionsOpen] = useState(false);
  // Every card in the Call Desk queue renders fully expanded (unlike the
  // Contacts desk, where a card's contents only mount once expanded), so
  // HunterDecisionMakers firing its GET /leads/{id}/contacts on mount meant
  // one request per visible lead all at once -- 30 leads on screen, 30
  // parallel calls. Gated behind a click, same progressive-disclosure
  // pattern as objectionsOpen above.
  const [contactsOpen, setContactsOpen] = useState(false);
  // promote_primary() (backend) fills this from lead_contacts the moment any
  // contact is known, so it's a free, already-available "has this lead been
  // searched before" signal -- no separate request needed just to decide
  // which entry point to show. "Decision Maker" is the pre-cleanup
  // placeholder some older leads may still carry (see docs.md 2026-09-15).
  const hasKnownContact = Boolean(lead.contact_name) && lead.contact_name !== "Decision Maker";
  const [booked, setBooked] = useState(false);
  const bookedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "🎯 Booked!" no longer records the outcome immediately -- it opens this
  // date/time prompt first (in place of the dispositions grid, see the
  // render below), and ONLY the "Confirm booking" click actually calls
  // record.mutate(). Cancel just closes the prompt with zero network calls,
  // so the outcome genuinely never gets recorded on a cancel.
  const [bookingPrompt, setBookingPrompt] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");

  // Same pattern as the meeting-booking prompt above -- Callback Scheduled asks for a date/time before
  // recording anything (structure-plan.md Phase 3), a separate field (callback_at) from meeting_at.
  const [callbackPrompt, setCallbackPrompt] = useState(false);
  const [callbackDate, setCallbackDate] = useState("");
  const [callbackTime, setCallbackTime] = useState("");

  // A "meeting_booked" outcome clears sent_to_desk_at (structure-plan.md Phase 3), so ColdCallView's
  // queue filter drops it and this component unmounts almost immediately -- well within the 4s window.
  // Clear the pending timer on unmount so it never calls setState after that.
  useEffect(() => {
    return () => {
      if (bookedTimer.current) clearTimeout(bookedTimer.current);
    };
  }, []);

  async function disposition(outcome: CallOutcome) {
    if (outcome === "meeting_booked") {
      setBookingPrompt(true);
      return;
    }
    if (outcome === "callback_scheduled") {
      setCallbackPrompt(true);
      return;
    }
    const closing = CLOSING_DISPOSITIONS[outcome];
    if (closing) {
      const ok = await confirm({
        title: closing.title(lead.company_name),
        description: closing.body,
        confirmLabel: closing.confirmLabel,
        tone: "danger",
      });
      if (!ok) return;
    }
    const label = DISPOSITIONS.find((d) => d.outcome === outcome)?.label ?? outcome;
    record.mutate(
      { id: lead.id, outcome, notes: note, mention: extractMentions(note, users) },
      {
        onSuccess: () => {
          // Wrong Number gets its own message (it goes back to Contacts, not just "saved").
          toast.success(
            outcome === "wrong_number"
              ? TOASTS.wrongNumberSent(lead.company_name)
              : TOASTS.disposition(label, lead.company_name),
          );
          setNote("");
          onActionTaken?.(lead.id);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
      },
    );
  }

  function confirmBooking() {
    if (!meetingDate || !meetingTime) return;
    record.mutate(
      {
        id: lead.id,
        outcome: "meeting_booked",
        notes: note,
        mention: extractMentions(note, users),
        meetingAt: `${meetingDate}T${meetingTime}:00`,
      },
      {
        onSuccess: () => {
          toast.success(TOASTS.meetingBooked(lead.company_name));
          setNote("");
          setBookingPrompt(false);
          setBooked(true);
          onActionTaken?.(lead.id);
          bookedTimer.current = setTimeout(() => setBooked(false), 4000);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
      },
    );
  }

  function cancelBooking() {
    setBookingPrompt(false);
  }

  function confirmCallback() {
    if (!callbackDate || !callbackTime) return;
    record.mutate(
      {
        id: lead.id,
        outcome: "callback_scheduled",
        notes: note,
        mention: extractMentions(note, users),
        callbackAt: `${callbackDate}T${callbackTime}:00`,
      },
      {
        onSuccess: () => {
          toast.success(TOASTS.callbackScheduled(lead.company_name));
          setNote("");
          setCallbackPrompt(false);
          onActionTaken?.(lead.id);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
      },
    );
  }

  function cancelCallback() {
    setCallbackPrompt(false);
  }

  // Voicemail/Hang Up/No Answer -- the mark + last-touch date shown in the summary (section 3 above).
  const lastTouchLabel = ["voicemail", "hang_up", "no_answer"].includes(lead.last_call_outcome)
    ? DISPOSITIONS.find((d) => d.outcome === lead.last_call_outcome)?.label
    : undefined;
  const pickedByLabel = CALL_PICKED_BY.options.find((o) => o.value === lead.call_picked_by)?.label;

  const summary = (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="serif-title text-[1.4rem] font-bold">{lead.company_name}</h3>
        <span className="rounded-[6px] bg-tag px-2 py-1 font-mono text-[0.8rem] font-bold">
          {currency(lead.deal_value)}
        </span>
        <PhoneBadge status={lead.phone_status} phone={lead.contact_phone} />
        <LocalTimeBadge tz={lead.call_tz} hasPhone={Boolean(lead.contact_phone)} />
        <span className="stage-tag">{lead.industry_tag}</span>
      </div>
      <p className="mb-1 mt-1 text-[0.88rem] text-muted">
        👤 {lead.contact_name || "Decision Maker"}
        {lead.contact_role && ` · ${lead.contact_role}`}
      </p>
      {/* Ali (Sales Rep, 2026-09-15): "there should be date and time
          mentioned on the leads when they were generated ... also the
          country name" -- and who/what added it. All three from data
          already on the lead, none of it was previously shown anywhere. */}
      <p className="text-[0.75rem] text-muted">
        🕒 {addedAt(lead.created_at)}
        {" · "}
        {LEAD_SOURCE_LABELS[leadSource(lead.source_prompt)]}
        {lead.country && ` · ${countryLabel(lead.country)}`}
        <LeadWho lead={lead} />
      </p>
      {/* Voicemail/Hang Up/No Answer -- structure-plan.md Phase 3: the mark that makes it clear this
          lead has already been tried, and when, so a rep doesn't call it again by mistake. */}
      {lastTouchLabel && (
        <p className="mt-1 text-[0.78rem] font-semibold text-muted">
          {lastTouchLabel} · {LAST_TOUCH.label(addedAt(lead.updated_at))}
        </p>
      )}
      {pickedByLabel && (
        <p className="mt-0.5 text-[0.78rem] text-muted">{CALL_PICKED_BY.marked(pickedByLabel)}</p>
      )}
    </div>
  );

  return (
    // Defaults open -- a card in the call queue is meant to be worked right
    // now, unlike Pipeline/Contacts' browse-and-search lists which default
    // closed. Collapsing is still available (the same ▾/▸ arrow, click to
    // toggle) so a rep can tuck away a lead they're not calling next without
    // losing their place in the queue -- previously this whole card had no
    // collapse at all.
    <LeadCard lead={lead} summary={summary} defaultOpen>
      <div className="grid grid-cols-[1.2fr_2fr] gap-6">
        {/* Dialer column */}
        <div className="flex flex-col gap-3">
          <h4 className="text-[0.95rem] font-semibold">📞 Direct Outbound Line</h4>
          {lead.contact_phone ? (
            <PhoneNumberList phones={lead.contact_phone} size="button" />
          ) : (
            <p
              className="rounded-[8px] px-3 py-2 text-[0.85rem]"
              style={{ background: "var(--warn-tint)", color: "var(--warn)" }}
            >
              No phone on file.
            </p>
          )}

          <LinkedInResearchPanel lead={lead} />
          <EditContact lead={lead} />

          <h4 className="mt-2 text-[0.95rem] font-semibold">{BATTLECARD.researchHeading}</h4>
          <div className="flex flex-col gap-1 text-[0.82rem]">
            {lead.company_website && (
              <a
                href={externalUrl(lead.company_website)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline"
              >
                {BATTLECARD.websiteLink}
              </a>
            )}
            {hasUsableEmail(lead.contact_email) && (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={mailtoUrl(lead.contact_email, lead.subject, lead.body)}
                  className="text-accent underline"
                >
                  ✉️ {lead.contact_email}
                </a>
                <button
                  type="button"
                  onClick={() => markEmailSent.mutate()}
                  disabled={markEmailSent.isPending || emailMarked}
                  className="inline-flex cursor-pointer items-center gap-1 text-[0.75rem] text-muted hover:text-accent disabled:cursor-default"
                >
                  {markEmailSent.isPending && <Loader className="h-3 w-3" />}
                  {emailMarked ? BATTLECARD.emailMarkedSent : BATTLECARD.markEmailSent}
                </button>
              </div>
            )}
            {markEmailSent.isError && (
              <p className="text-[0.75rem] text-danger">
                {markEmailSent.error instanceof Error ? markEmailSent.error.message : BATTLECARD.markEmailSentFailed}
              </p>
            )}
            <a
              href={lead.contact_linkedin || linkedInXrayUrl(lead.contact_name, lead.company_name)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline"
            >
              {lead.contact_linkedin ? BATTLECARD.linkedInLink : BATTLECARD.linkedInSearchLink}
            </a>
          </div>

          {contactsOpen ? (
            <HunterDecisionMakers lead={lead} autoSearchOnMount={!hasKnownContact} />
          ) : hasKnownContact ? (
            <button
              type="button"
              onClick={() => setContactsOpen(true)}
              className="cursor-pointer text-left text-[0.85rem] font-semibold text-muted hover:text-accent"
            >
              {BATTLECARD.showContacts}
            </button>
          ) : (
            <Button variant="secondary" size="sm" block onClick={() => setContactsOpen(true)}>
              {BATTLECARD.findContacts}
            </Button>
          )}
          <SiteScanPanel lead={lead} />

          <div
            className="rounded-[8px] bg-input px-3 py-2"
            style={{ borderLeft: "3px solid var(--accent)" }}
          >
            <p className="metric-label !mb-1">{BATTLECARD.whyHelps}</p>
            <p className="text-[0.82rem]">{lead.reason || BATTLECARD.whyHelpsFallback}</p>
          </div>
        </div>

        {/* Battlecard column */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[0.95rem] font-semibold">
              {BATTLECARD.scriptHeading}
            </h4>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => generate.mutate()}
              loading={generate.isPending}
            >
              {generate.isPending ? BATTLECARD.generatingBattlecard : BATTLECARD.generateBattlecard}
            </Button>
          </div>
          {generate.isError && (
            <p className="text-[0.8rem] text-danger">
              {generate.error instanceof Error ? generate.error.message : BATTLECARD.generateFailed}
            </p>
          )}
          <p
            className="rounded-[8px] bg-tag px-4 py-3 text-[0.95rem] leading-[1.55]"
            style={{ border: "1.5px solid var(--accent)" }}
          >
            “{scriptFor(lead)}”
          </p>

          <div>
            <button
              type="button"
              onClick={() => setObjectionsOpen((v) => !v)}
              className="cursor-pointer text-[0.85rem] font-semibold text-muted hover:text-accent"
            >
              {BATTLECARD.objectionsHeading}
            </button>
            {objectionsOpen && (
              <div className="mt-2 whitespace-pre-line rounded-[8px] bg-input px-4 py-3 text-[0.85rem] leading-relaxed">
                {lead.objection_notes && lead.objection_notes.length >= 15
                  ? lead.objection_notes
                  : FALLBACK_OBJECTIONS}
              </div>
            )}
          </div>

          {/* "Call picked by" -- structure-plan.md Phase 3. Tag only: no stage change, no queue move. */}
          <div>
            <p className="mb-1 text-[0.8rem] font-semibold text-muted">{CALL_PICKED_BY.heading}</p>
            <div className="flex flex-wrap gap-2">
              {CALL_PICKED_BY.options.map((o) => (
                <Button
                  key={o.value}
                  variant={lead.call_picked_by === o.value ? "primary" : "secondary"}
                  size="sm"
                  loading={callPickedBy.isPending}
                  onClick={() => callPickedBy.mutate({ id: lead.id, value: o.value })}
                >
                  {o.label}
                </Button>
              ))}
            </div>
            {callPickedBy.isError && (
              <p className="mt-1 text-[0.75rem] text-danger">
                {callPickedBy.error instanceof Error ? callPickedBy.error.message : CALL_PICKED_BY.failed}
              </p>
            )}
          </div>

          <Field
            label={
              <span className="flex items-center justify-between gap-2">
                {BATTLECARD.noteLabel}
                {/* Opens the full edit form in a popup right here, so structured fields -- an email
                    given verbally on the call, for example -- get saved properly instead of typed into
                    this notes box. structure-plan.md Phase 3; popup instead of a new tab per the user
                    ("dusry tab pr na lekr jaye, wohin popup ho"). */}
                <EditLeadDialog
                  lead={lead}
                  trigger={
                    <button
                      type="button"
                      className="cursor-pointer text-[0.75rem] font-semibold text-accent underline"
                    >
                      ✏️ Edit
                    </button>
                  }
                />
              </span>
            }
          >
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <MentionField
                  value={note}
                  onChange={setNote}
                  placeholder={BATTLECARD.notePlaceholder}
                  maxLength={4000}
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                loading={addNote.isPending}
                disabled={!note.trim()}
                onClick={() =>
                  addNote.mutate(
                    { id: lead.id, text: note, mention: extractMentions(note, users) },
                    {
                      onSuccess: () => {
                        setNote("");
                        toast.success(TOASTS.noteAdded(lead.company_name));
                      },
                      onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
                    },
                  )
                }
              >
                {addNote.isPending ? "Adding…" : BATTLECARD.addNote}
              </Button>
            </div>
            <p className="mt-1 text-[0.75rem] text-muted">{MENTIONS.hint}</p>
          </Field>
          {addNote.isError && (
            <p className="text-[0.8rem] text-danger">
              {addNote.error instanceof Error ? addNote.error.message : BATTLECARD.addNoteFailed}
            </p>
          )}

          {booked && (
            <p className="text-[0.9rem] font-semibold text-success">
              {BATTLECARD.booked(lead.company_name, currency(lead.deal_value))}
            </p>
          )}

          <p className="date-eyebrow !mb-1.5 mt-2">{BATTLECARD.dispositionsHeading}</p>
          {record.isError && (
            <p className="text-[0.8rem] text-danger">
              {record.error instanceof Error ? record.error.message : BATTLECARD.recordFailed}
            </p>
          )}
          {bookingPrompt ? (
            <div className="flex flex-col gap-2 rounded-[8px] border border-accent bg-input px-3 py-3">
              <p className="text-[0.85rem] font-semibold">{MEETING_BOOKING.prompt}</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label={MEETING_BOOKING.dateLabel}>
                  <Input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                  />
                </Field>
                <Field label={MEETING_BOOKING.timeLabel}>
                  <Input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" onClick={cancelBooking}>
                  {MEETING_BOOKING.cancel}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={record.isPending}
                  disabled={!meetingDate || !meetingTime}
                  onClick={confirmBooking}
                >
                  {MEETING_BOOKING.confirm}
                </Button>
              </div>
            </div>
          ) : callbackPrompt ? (
            <div className="flex flex-col gap-2 rounded-[8px] border border-accent bg-input px-3 py-3">
              <p className="text-[0.85rem] font-semibold">{CALLBACK_BOOKING.prompt}</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label={CALLBACK_BOOKING.dateLabel}>
                  <Input type="date" value={callbackDate} onChange={(e) => setCallbackDate(e.target.value)} />
                </Field>
                <Field label={CALLBACK_BOOKING.timeLabel}>
                  <Input type="time" value={callbackTime} onChange={(e) => setCallbackTime(e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" onClick={cancelCallback}>
                  {CALLBACK_BOOKING.cancel}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={record.isPending}
                  disabled={!callbackDate || !callbackTime}
                  onClick={confirmCallback}
                >
                  {CALLBACK_BOOKING.confirm}
                </Button>
              </div>
            </div>
          ) : (
            // 9 dispositions (Receptionist/Decision Maker moved to the "Call picked by" tag row above,
            // structure-plan.md Phase 3) -- 3-wide (3x3) fits evenly.
            <>
              <div className="grid grid-cols-3 gap-2">
                {DISPOSITIONS.map((d) => (
                  <Button
                    key={d.outcome}
                    // Orange only right after a meeting is actually booked (the
                    // same 4s `booked` window the success toast above uses) --
                    // not a permanent "this is the important button" highlight.
                    variant={d.outcome === "meeting_booked" && booked ? "primary" : "secondary"}
                    size="sm"
                    title={d.help}
                    loading={record.isPending}
                    onClick={() => disposition(d.outcome as CallOutcome)}
                  >
                    {d.label}
                  </Button>
                ))}
              </div>
              {/* "Email Send" sits with the other disposition buttons now, not off in the research column
                  -- moved here per the user ("yeh voicemails deadline in sab buttons k sath he ayega").
                  A flag ("this lead needs an email"), NOT a record that one went out (Mark Email Sent,
                  in the research column above, is that). Moves the lead to Pipeline. */}
              <Button
                variant="secondary"
                size="sm"
                block
                title={EMAIL_SEND.help}
                loading={needsEmail.isPending}
                onClick={() =>
                  needsEmail.mutate(lead.id, {
                    onSuccess: () => {
                      toast.success(EMAIL_SEND.sent(lead.company_name));
                      onActionTaken?.(lead.id);
                    },
                    onError: (e) => toast.error(e instanceof Error ? e.message : EMAIL_SEND.failed),
                  })
                }
              >
                {EMAIL_SEND.button}
              </Button>
              {needsEmail.isError && (
                <p className="text-[0.8rem] text-danger">
                  {needsEmail.error instanceof Error ? needsEmail.error.message : EMAIL_SEND.failed}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </LeadCard>
  );
}
