"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFullLead, useUpdateLead, useDeleteLead } from "@/hooks/use-leads";
import { enrichmentApi } from "@/lib/api";
import { BarLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import {
  CALLBACK_BOOKING,
  COUNTRIES,
  EDIT_FORM,
  MEETING_BOOKING,
  PIPELINE_STAGES,
  STANDARD_CATEGORIES,
  LOST_STAGE_CONFIRM,
  TOASTS,
} from "@/lib/constants";
import type { ExtraContactInput, Lead, PipelineStage } from "@/types";
import { Ico, stripEmoji, withIcons } from "@/components/ui/emoji-icon";

const EMPTY_ADD_CONTACT: ExtraContactInput = { name: "", role: "", email: "", phone: "", linkedin: "" };

/**
 * "Decision Makers" section of the Edit Lead form (user request, 2026-09-30: "Add a Lead" already lets
 * you type in extra contacts when CREATING a lead, but there was no way to add one to a lead that already
 * exists -- this belongs in the edit form, not a separate panel). Shares the ["lead-contacts", lead.id]
 * query key with components/enrichment/contacts-panel.tsx, so adding one here also updates that panel
 * wherever else it's shown for the same lead, and vice versa.
 */
/** The Name/Role/Email/Phone/LinkedIn field grid shared by the "add" and "edit" forms below -- same
 * 2-column layout "Add a Lead"'s extra-contact rows use. */
function ContactFields({
  value,
  onChange,
}: {
  value: ExtraContactInput;
  onChange: (field: keyof ExtraContactInput, v: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name">
          <Input value={value.name} onChange={(e) => onChange("name", e.target.value)} />
        </Field>
        <Field label="Role / Title">
          <Input value={value.role} onChange={(e) => onChange("role", e.target.value)} />
        </Field>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Email">
          <Input type="email" value={value.email} onChange={(e) => onChange("email", e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input type="tel" value={value.phone} onChange={(e) => onChange("phone", e.target.value)} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="LinkedIn URL">
          <Input value={value.linkedin} onChange={(e) => onChange("linkedin", e.target.value)} />
        </Field>
      </div>
    </>
  );
}

function DecisionMakersSection({ leadId }: { leadId: number }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: contacts = [] } = useQuery({
    queryKey: ["lead-contacts", leadId],
    queryFn: () => enrichmentApi.contacts(leadId),
  });
  const [adding, setAdding] = useState(false);
  const [newContact, setNewContact] = useState<ExtraContactInput>(EMPTY_ADD_CONTACT);
  const addContact = useMutation({
    mutationFn: (input: ExtraContactInput) => enrichmentApi.addContact(leadId, input),
    onSuccess: (rows) => {
      qc.setQueryData(["lead-contacts", leadId], rows);
      toast.success(TOASTS.contactAdded(newContact.name));
      setNewContact(EMPTY_ADD_CONTACT);
      setAdding(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
  });
  function setField(field: keyof ExtraContactInput, value: string) {
    setNewContact((c) => ({ ...c, [field]: value }));
  }

  // Editing an existing contact (user, 2026-10-02: "jo bhi members add kr rhy hein unhyn edit nhi kr sk
  // rhy" -- add-only until now, the list below rendered plain text with no way to correct a typo or fill in
  // a number found later by hand). Same form as "add", pre-filled, PATCH instead of POST.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContact, setEditContact] = useState<ExtraContactInput>(EMPTY_ADD_CONTACT);
  const editMutation = useMutation({
    mutationFn: (input: ExtraContactInput) => enrichmentApi.editContact(leadId, editingId as number, input),
    onSuccess: (rows) => {
      qc.setQueryData(["lead-contacts", leadId], rows);
      toast.success(TOASTS.contactUpdated(editContact.name));
      setEditingId(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
  });
  function setEditField(field: keyof ExtraContactInput, value: string) {
    setEditContact((c) => ({ ...c, [field]: value }));
  }
  function startEdit(c: (typeof contacts)[number]) {
    setAdding(false);
    setEditingId(c.id);
    setEditContact({ name: c.name, role: c.role, email: c.email, phone: c.phone, linkedin: c.linkedin });
  }

  return (
    <>
      <h4 className="mt-2 text-[1rem] font-semibold"><Ico e="👥" /> Decision Makers</h4>
      {contacts.length > 0 && (
        <div className="rounded-[8px] border border-border bg-card p-3">
          {contacts.map((c) =>
            editingId === c.id ? (
              <div key={c.id} className="border-b border-border py-3 last:border-0">
                <ContactFields value={editContact} onChange={setEditField} />
                {editMutation.isError && (
                  <p className="mt-2 text-[0.78rem] text-danger">
                    {editMutation.error instanceof Error ? editMutation.error.message : TOASTS.actionFailed}
                  </p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!editContact.name.trim()}
                    loading={editMutation.isPending}
                    onClick={() => editMutation.mutate(editContact)}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 border-b border-border py-1.5 text-[0.82rem] last:border-0"
              >
                <span>
                  <strong>{c.name}</strong>
                  {c.role && <span className="text-muted"> — {c.role}</span>}
                  {c.email && <span className="text-muted"> · {c.email}</span>}
                  {c.phone && <span className="text-muted"> · {c.phone}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => startEdit(c)}
                  className="shrink-0 cursor-pointer text-[0.78rem] font-semibold text-accent"
                >
                  Edit
                </button>
              </div>
            ),
          )}
        </div>
      )}
      {adding ? (
        <div className="rounded-[8px] border border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[0.78rem] font-semibold text-muted">New Contact</p>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewContact(EMPTY_ADD_CONTACT);
              }}
              className="cursor-pointer text-[0.78rem] text-danger"
            >
              <Ico e="✕" /> Cancel
            </button>
          </div>
          <ContactFields value={newContact} onChange={setField} />
          {addContact.isError && (
            <p className="mt-2 text-[0.78rem] text-danger">
              {addContact.error instanceof Error ? addContact.error.message : TOASTS.actionFailed}
            </p>
          )}
          <Button
            variant="primary"
            size="sm"
            block
            className="mt-3"
            disabled={!newContact.name.trim()}
            loading={addContact.isPending}
            onClick={() => addContact.mutate(newContact)}
          >
            Save Contact
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setAdding(true);
          }}
          className="cursor-pointer text-left text-[0.8rem] font-semibold text-accent"
        >
          + Add a Decision Maker
        </button>
      )}
    </>
  );
}

/**
 * The one lead-edit form (structure-plan.md Phase 2: everything but notes is edited from Leads/Contacts,
 * nowhere else). Extracted out of components/contacts/contacts-view.tsx's ClassificationPanel so it can
 * be shown two ways: inline there, and in a popup (EditLeadDialog) from Cold Call Desk / Pipeline /
 * Projects / Meetings -- the user asked for the popup so "Edit" no longer navigates away from wherever
 * they already are.
 */
export function LeadEditForm({ lead, onDone }: { lead: Lead; onDone?: () => void }) {
  // A slim list row has an EMPTY body; this form sends `body` back on save, so it must not open (and
  // initialise its fields) until the real one is here -- otherwise "Save" would wipe the outreach draft.
  const { lead: full, ready, failed } = useFullLead(lead);
  if (failed) return <p className="py-4 text-[0.85rem] text-danger">{EDIT_FORM.loadFailed}</p>;
  if (!ready) {
    return (
      <div className="py-4">
        <BarLoader label={EDIT_FORM.loading} />
      </div>
    );
  }
  return <LeadEditFormFields lead={full} onDone={onDone} />;
}

function LeadEditFormFields({ lead, onDone }: { lead: Lead; onDone?: () => void }) {
  const update = useUpdateLead();
  const remove = useDeleteLead();
  const toast = useToast();
  const confirm = useConfirm();
  const [subject, setSubject] = useState(lead.subject);
  const [body, setBody] = useState(lead.body);
  const [category, setCategory] = useState(lead.industry_tag);
  const [stage, setStage] = useState<PipelineStage>(lead.pipeline_stage);
  const [phone, setPhone] = useState(lead.contact_phone);
  const [linkedin, setLinkedin] = useState(lead.contact_linkedin);
  const [dealValue, setDealValue] = useState(lead.deal_value);
  // Corrects a wrong or missing country on an already-saved lead.
  const [country, setCountry] = useState(lead.country);
  // No way at all to set a meeting date/time otherwise, so selecting "Meeting Booked" here always left
  // meeting_at null, silently invisible on the Meetings tab despite the lead being correctly staged (see
  // docs.md 2026-09-16).
  const [meetingDate, setMeetingDate] = useState(lead.meeting_at ? lead.meeting_at.slice(0, 10) : "");
  const [meetingTime, setMeetingTime] = useState(lead.meeting_at ? lead.meeting_at.slice(11, 16) : "");
  // Callback date/time (2026-09-24). This form had no way to set one, so a lead whose Callback Scheduled
  // went through the old production button that never asked for a time (docs.md 2026-09-23) could not be
  // given one -- and one saved with a time is what puts a lead on Pipeline under the original rule too.
  // Shown only where it's relevant (a follow-up lead, or one that already has / had a callback) rather than
  // on every lead's form. callback_at comes back as naive wall-clock ISO, like meeting_at (schemas/lead.py).
  const [callbackDate, setCallbackDate] = useState(lead.callback_at ? lead.callback_at.slice(0, 10) : "");
  const [callbackTime, setCallbackTime] = useState(lead.callback_at ? lead.callback_at.slice(11, 16) : "");
  const showCallback =
    stage === "followup_due" || Boolean(lead.callback_at) || lead.last_call_outcome === "callback_scheduled";

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-[1rem] font-semibold"><Ico e="✉" /> Outreach Draft</h4>
      <Field label="Subject">
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={500} />
      </Field>
      <Field label="Body">
        <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>

      <h4 className="mt-2 text-[1rem] font-semibold"><Ico e="🏷" /> Classification &amp; Deal</h4>
      <Field label="Category">
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          {STANDARD_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {stripEmoji(c)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Pipeline Stage">
        <Select value={stage} onChange={(e) => setStage(e.target.value as PipelineStage)}>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {stripEmoji(s.label)}
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
      {showCallback && (
        <>
          <p className="text-[0.85rem] font-semibold">{withIcons(CALLBACK_BOOKING.prompt)}</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label={CALLBACK_BOOKING.dateLabel}>
              <Input type="date" value={callbackDate} onChange={(e) => setCallbackDate(e.target.value)} />
            </Field>
            <Field label={CALLBACK_BOOKING.timeLabel}>
              <Input type="time" value={callbackTime} onChange={(e) => setCallbackTime(e.target.value)} />
            </Field>
          </div>
        </>
      )}
      <Field label="Contact Phone">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <Field label="LinkedIn URL">
        <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
      </Field>

      <DecisionMakersSection leadId={lead.id} />

      <Field label="Deal Value ($)">
        <Input
          type="number"
          step={1000}
          min={0}
          value={dealValue}
          onChange={(e) => setDealValue(Number(e.target.value))}
        />
      </Field>
      <Field label="Country">
        <Select value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">Not specified</option>
          {COUNTRIES.map((c) => (
            <option key={c.id} value={c.id}>
              {stripEmoji(c.label)}
            </option>
          ))}
        </Select>
      </Field>
      <Button
        variant="primary"
        size="sm"
        loading={update.isPending}
        disabled={stage === "meeting_booked" && !(meetingDate && meetingTime)}
        onClick={async () => {
          if (stage === "lost" && lead.pipeline_stage !== "lost") {
            const ok = await confirm({
              title: LOST_STAGE_CONFIRM.title(lead.company_name),
              description: LOST_STAGE_CONFIRM.body,
              confirmLabel: LOST_STAGE_CONFIRM.confirmLabel,
              tone: "danger",
            });
            if (!ok) return;
          }
          update.mutate(
            {
              id: lead.id,
              input: {
                subject,
                body,
                industry_tag: category,
                pipeline_stage: stage,
                contact_phone: phone,
                contact_linkedin: linkedin,
                deal_value: dealValue,
                country,
                ...(meetingDate && meetingTime
                  ? { meeting_at: `${meetingDate}T${meetingTime}:00` }
                  : {}),
                // Only when the callback fields are showing AND both are filled -- never sends a half-
                // filled value, and (like every field here) can't clear an existing callback.
                ...(showCallback && callbackDate && callbackTime
                  ? { callback_at: `${callbackDate}T${callbackTime}:00` }
                  : {}),
              },
            },
            {
              onSuccess: () => {
                toast.success(TOASTS.saved(lead.company_name));
                onDone?.();
              },
              onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
            },
          );
        }}
      >
        <Ico e="💾" /> Save Lead Details
      </Button>
      {update.isError && (
        <p className="text-[0.8rem] text-danger">
          {update.error instanceof Error ? update.error.message : "Failed to save updates. Try again."}
        </p>
      )}

      <Button
        variant="danger"
        size="sm"
        loading={remove.isPending}
        onClick={async () => {
          const ok = await confirm({
            title: `Remove ${lead.company_name} from the CRM?`,
            description:
              "This DELETES the lead and its contacts permanently -- it cannot be undone.\n\nJust not interested? Set the stage to Closed Lost instead; the lead stays in your CRM.",
            confirmLabel: "Yes, delete permanently",
            tone: "danger",
          });
          if (!ok) return;
          remove.mutate(lead.id, {
            onSuccess: () => {
              toast.success(TOASTS.leadRemoved(lead.company_name));
              onDone?.();
            },
            onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
          });
        }}
      >
        <Ico e="🗑" /> Remove
      </Button>
      {remove.isError && (
        <p className="text-[0.8rem] text-danger">
          {remove.error instanceof Error ? remove.error.message : "Failed to remove this lead. Try again."}
        </p>
      )}
    </div>
  );
}
