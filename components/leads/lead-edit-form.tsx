"use client";

import { useState } from "react";
import { useUpdateLead, useDeleteLead } from "@/hooks/use-leads";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import {
  COUNTRIES,
  MEETING_BOOKING,
  PIPELINE_STAGES,
  STANDARD_CATEGORIES,
  LOST_STAGE_CONFIRM,
  TOASTS,
} from "@/lib/constants";
import type { Lead, PipelineStage } from "@/types";

/**
 * The one lead-edit form (structure-plan.md Phase 2: everything but notes is edited from Leads/Contacts,
 * nowhere else). Extracted out of components/contacts/contacts-view.tsx's ClassificationPanel so it can
 * be shown two ways: inline there, and in a popup (EditLeadDialog) from Cold Call Desk / Pipeline /
 * Projects / Meetings -- the user asked for the popup so "Edit" no longer navigates away from wherever
 * they already are.
 */
export function LeadEditForm({ lead, onDone }: { lead: Lead; onDone?: () => void }) {
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

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-[1rem] font-semibold">✉️ Outreach Draft</h4>
      <Field label="Subject">
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={500} />
      </Field>
      <Field label="Body">
        <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>

      <h4 className="mt-2 text-[1rem] font-semibold">🏷️ Classification &amp; Deal</h4>
      <Field label="Category">
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          {STANDARD_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
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
              {c.label}
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
        💾 Save Lead Details
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
        🗑️ Remove
      </Button>
      {remove.isError && (
        <p className="text-[0.8rem] text-danger">
          {remove.error instanceof Error ? remove.error.message : "Failed to remove this lead. Try again."}
        </p>
      )}
    </div>
  );
}
