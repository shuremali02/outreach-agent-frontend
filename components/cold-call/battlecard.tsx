"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUpdateLead, useCallOutcome } from "@/hooks/use-leads";
import { LinkedInResearchPanel, HunterDecisionMakers, SiteScanPanel } from "@/components/enrichment";
import { PhoneBadge } from "@/components/leads/phone-badge";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { enrichmentApi } from "@/lib/api";
import {
  currency, externalUrl, hasUsableEmail, telUrl, mailtoUrl,
  linkedInXrayUrl,
} from "@/lib/format";
import {
  BATTLECARD,
  DISPOSITIONS,
  FALLBACK_OBJECTIONS,
  MEETING_BOOKING,
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
        </div>
      )}
    </div>
  );
}

export function Battlecard({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const record = useCallOutcome();
  const generate = useMutation({
    mutationFn: () => enrichmentApi.generateBattlecard(lead.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
  const [note, setNote] = useState("");
  const [objectionsOpen, setObjectionsOpen] = useState(false);
  // Every card in the Call Desk queue renders fully expanded (unlike the
  // Contacts desk, where a card's contents only mount once expanded), so
  // HunterDecisionMakers firing its GET /leads/{id}/contacts on mount meant
  // one request per visible lead all at once -- 30 leads on screen, 30
  // parallel calls. Gated behind a click, same progressive-disclosure
  // pattern as objectionsOpen above.
  const [contactsOpen, setContactsOpen] = useState(false);
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
      { onSuccess: () => setNote("") },
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
          bookedTimer.current = setTimeout(() => setBooked(false), 4000);
        },
      },
    );
  }

  function cancelBooking() {
    setBookingPrompt(false);
  }

  return (
    <div className="mb-4 rounded-[12px] border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h3 className="serif-title text-[1.4rem] font-bold">{lead.company_name}</h3>
        <span className="rounded-[6px] bg-tag px-2 py-1 font-mono text-[0.8rem] font-bold">
          {currency(lead.deal_value)}
        </span>
        <PhoneBadge status={lead.phone_status} phone={lead.contact_phone} />
        <span className="stage-tag">{lead.industry_tag}</span>
      </div>
      <p className="mb-4 text-[0.88rem] text-muted">
        👤 {lead.contact_name || "Decision Maker"}
        {lead.contact_role && ` · ${lead.contact_role}`}
      </p>

      <div className="grid grid-cols-[1.2fr_2fr] gap-6">
        {/* Dialer column */}
        <div className="flex flex-col gap-3">
          <h4 className="text-[0.95rem] font-semibold">📞 Direct Outbound Line</h4>
          {lead.contact_phone ? (
            <a
              href={telUrl(lead.contact_phone)}
              className="block rounded-[8px] bg-success px-3 py-2.5 text-center font-mono text-[1.15rem] font-bold text-white no-underline shadow-[var(--shadow-call)]"
            >
              📞 Call {lead.contact_phone}
            </a>
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
              <a
                href={mailtoUrl(lead.contact_email, lead.subject, lead.body)}
                className="text-accent underline"
              >
                ✉️ {lead.contact_email}
              </a>
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
            <HunterDecisionMakers lead={lead} />
          ) : (
            <button
              type="button"
              onClick={() => setContactsOpen(true)}
              className="cursor-pointer text-left text-[0.85rem] font-semibold text-muted hover:text-accent"
            >
              {BATTLECARD.showContacts}
            </button>
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
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={BATTLECARD.notePlaceholder}
              maxLength={4000}
            />
          </Field>

          {booked && (
            <p className="text-[0.9rem] font-semibold text-success">
              {BATTLECARD.booked(lead.company_name, currency(lead.deal_value))}
            </p>
          )}

          <p className="date-eyebrow !mb-1.5 mt-2">{BATTLECARD.dispositionsHeading}</p>
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
            <div className="grid grid-cols-5 gap-2">
              {DISPOSITIONS.map((d) => (
                <Button
                  key={d.outcome}
                  variant={"primary" in d && d.primary ? "primary" : "secondary"}
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
    </div>
  );
}
