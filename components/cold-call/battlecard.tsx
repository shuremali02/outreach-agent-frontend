"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUpdateLead, useCallOutcome, useAddNote } from "@/hooks/use-leads";
import { LinkedInResearchPanel, HunterDecisionMakers, SiteScanPanel } from "@/components/enrichment";
import { LeadCard } from "@/components/leads/lead-card";
import { PhoneBadge } from "@/components/leads/phone-badge";
import { PhoneNumberList } from "@/components/leads/phone-number-list";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { enrichmentApi, leadsApi } from "@/lib/api";
import {
  addedAt, currency, externalUrl, hasUsableEmail, leadSource, mailtoUrl,
  linkedInXrayUrl,
} from "@/lib/format";
import {
  BATTLECARD,
  DISPOSITIONS,
  FALLBACK_OBJECTIONS,
  LEAD_SOURCE_LABELS,
  MEETING_BOOKING,
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
            disabled={update.isPending}
            onClick={() =>
              update.mutate({
                id: lead.id,
                input: { contact_phone: phone, contact_linkedin: linkedin },
              })
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
  const record = useCallOutcome();
  const generate = useMutation({
    mutationFn: () => enrichmentApi.generateBattlecard(lead.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
  // "Open in Mail App" only opens a mailto: link -- no send confirmation
  // reaches the backend, so this is a separate, explicit, rep-confirmed
  // record (feeds the Today page's Emails count, call_events.py).
  const [emailMarked, setEmailMarked] = useState(false);
  const markEmailSent = useMutation({
    mutationFn: () => leadsApi.markEmailSent(lead.id),
    onSuccess: () => setEmailMarked(true),
  });
  const [note, setNote] = useState("");
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

  // A "meeting_booked" outcome moves the lead out of CALL_QUEUE_STAGES, so
  // ColdCallView's queue filter drops it and this component unmounts almost
  // immediately -- well within the 4s window. Clear the pending timer on
  // unmount so it never calls setState after that.
  useEffect(() => {
    return () => {
      if (bookedTimer.current) clearTimeout(bookedTimer.current);
    };
  }, []);

  function disposition(outcome: CallOutcome) {
    if (outcome === "meeting_booked") {
      setBookingPrompt(true);
      return;
    }
    record.mutate(
      { id: lead.id, outcome, notes: note },
      {
        onSuccess: () => {
          setNote("");
          onActionTaken?.(lead.id);
        },
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
        meetingAt: `${meetingDate}T${meetingTime}:00`,
      },
      {
        onSuccess: () => {
          setNote("");
          setBookingPrompt(false);
          setBooked(true);
          onActionTaken?.(lead.id);
          bookedTimer.current = setTimeout(() => setBooked(false), 4000);
        },
      },
    );
  }

  function cancelBooking() {
    setBookingPrompt(false);
  }

  const summary = (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="serif-title text-[1.4rem] font-bold">{lead.company_name}</h3>
        <span className="rounded-[6px] bg-tag px-2 py-1 font-mono text-[0.8rem] font-bold">
          {currency(lead.deal_value)}
        </span>
        <PhoneBadge status={lead.phone_status} phone={lead.contact_phone} />
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
      </p>
    </div>
  );

  return (
    // Defaults open -- a card in the call queue is meant to be worked right
    // now, unlike Pipeline/Contacts' browse-and-search lists which default
    // closed. Collapsing is still available (the same ▾/▸ arrow, click to
    // toggle) so a rep can tuck away a lead they're not calling next without
    // losing their place in the queue -- previously this whole card had no
    // collapse at all.
    <LeadCard summary={summary} defaultOpen>
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
                  className="cursor-pointer text-[0.75rem] text-muted hover:text-accent disabled:cursor-default"
                >
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
              disabled={generate.isPending}
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

          <Field label={BATTLECARD.noteLabel}>
            <div className="flex gap-2">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={BATTLECARD.notePlaceholder}
                maxLength={4000}
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={addNote.isPending || !note.trim()}
                onClick={() =>
                  addNote.mutate({ id: lead.id, text: note }, { onSuccess: () => setNote("") })
                }
              >
                {addNote.isPending ? "Adding…" : BATTLECARD.addNote}
              </Button>
            </div>
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
                  disabled={!meetingDate || !meetingTime || record.isPending}
                  onClick={confirmBooking}
                >
                  {MEETING_BOOKING.confirm}
                </Button>
              </div>
            </div>
          ) : (
            // 11 dispositions now (added Closed; Irrelevant renamed to Wrong
            // Number) -- 4-wide (4+4+3) fits better than a 5-wide 5+5+1.
            <div className="grid grid-cols-4 gap-2">
              {DISPOSITIONS.map((d) => (
                <Button
                  key={d.outcome}
                  // Orange only right after a meeting is actually booked (the
                  // same 4s `booked` window the success toast above uses) --
                  // not a permanent "this is the important button" highlight.
                  variant={d.outcome === "meeting_booked" && booked ? "primary" : "secondary"}
                  size="sm"
                  title={d.help}
                  disabled={record.isPending}
                  onClick={() => disposition(d.outcome as CallOutcome)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </LeadCard>
  );
}
