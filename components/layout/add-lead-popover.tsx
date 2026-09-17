"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { leadsApi } from "@/lib/api";
import { COUNTRIES, MEETING_BOOKING, PIPELINE_STAGES, STANDARD_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import type { CreateLeadInput, PipelineStage } from "@/types";

const EMPTY: CreateLeadInput = {
  company_name: "",
  company_website: "",
  contact_name: "",
  contact_role: "",
  contact_email: "",
  contact_phone: "",
  country: "",
  deal_value: 18000,
  // No default category -- was STANDARD_CATEGORIES[5] (Tech & Commercial),
  // which silently tagged a lead with the wrong category whenever a rep
  // didn't notice and change it. Blank forces an explicit, deliberate pick
  // (see the required-field validation below), same reasoning as country.
  industry_tag: "",
  pipeline_stage: "draft_ready",
  reason: "",
};

export function AddLeadPopover() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateLeadInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  // Separate date/time inputs, combined into meeting_at on submit -- same
  // pattern as Pipeline/Contacts' stage editors. A rep adding a lead they
  // already have a meeting with needs this set here, at creation time, not
  // just when editing an existing lead (see docs.md 2026-09-16).
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (input: CreateLeadInput) => leadsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["metrics"] });
      setForm(EMPTY);
      setMeetingDate("");
      setMeetingTime("");
      setError(null);
      setOpen(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  function set<K extends keyof CreateLeadInput>(key: K, value: CreateLeadInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const needsMeetingTime = form.pipeline_stage === "meeting_booked" && !(meetingDate && meetingTime);
  // Category and Country are now required -- see EMPTY's industry_tag
  // comment above for why a silent default was removed.
  const missingRequired = !form.industry_tag || !form.country;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button variant="secondary" size="sm">
          ➕ Add a Lead
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[420px] rounded-[12px] border border-border bg-card p-5 shadow-[var(--shadow-overlay)]"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.company_name.trim()) {
                setError("Company name is required.");
                return;
              }
              if (missingRequired) {
                setError("Select an Industry Category and a Country before saving.");
                return;
              }
              if (needsMeetingTime) {
                setError("Set both Date and Time for a lead staged as Meeting Booked.");
                return;
              }
              create.mutate({
                ...form,
                ...(meetingDate && meetingTime
                  ? { meeting_at: `${meetingDate}T${meetingTime}:00` }
                  : {}),
              });
            }}
            className="flex flex-col gap-3"
          >
            <Field label="Company Name *">
              <Input
                value={form.company_name}
                onChange={(e) => set("company_name", e.target.value)}
                required
                maxLength={200}
              />
            </Field>
            <Field label="Website URL">
              <Input
                value={form.company_website}
                onChange={(e) => set("company_website", e.target.value)}
                placeholder="https://"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact Person Name">
                <Input
                  value={form.contact_name}
                  onChange={(e) => set("contact_name", e.target.value)}
                />
              </Field>
              <Field label="Role / Title">
                <Input
                  value={form.contact_role}
                  onChange={(e) => set("contact_role", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact Email">
                <Input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => set("contact_email", e.target.value)}
                />
              </Field>
              <Field label="Contact Phone">
                <Input
                  type="tel"
                  value={form.contact_phone}
                  onChange={(e) => set("contact_phone", e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Estimated Deal Value ($)">
                <Input
                  type="number"
                  step={1000}
                  min={0}
                  value={form.deal_value}
                  onChange={(e) => set("deal_value", Number(e.target.value))}
                />
              </Field>
              <Field label="Pipeline Stage">
                <Select
                  value={form.pipeline_stage}
                  onChange={(e) => set("pipeline_stage", e.target.value as PipelineStage)}
                >
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {form.pipeline_stage === "meeting_booked" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={MEETING_BOOKING.dateLabel}>
                    <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
                  </Field>
                  <Field label={MEETING_BOOKING.timeLabel}>
                    <Input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} />
                  </Field>
                </div>
                {needsMeetingTime && (
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="Industry Category *">
                <Select
                  value={form.industry_tag}
                  onChange={(e) => set("industry_tag", e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {STANDARD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Country *">
                <Select value={form.country} onChange={(e) => set("country", e.target.value)} required>
                  <option value="" disabled>
                    Select a country
                  </option>
                  {COUNTRIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="3D Configurator Angle / Reason">
              <Textarea
                rows={3}
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
              />
            </Field>

            {error && <p className="text-[0.8rem] text-danger">{error}</p>}

            <Button
              type="submit"
              variant="primary"
              block
              disabled={create.isPending || needsMeetingTime || missingRequired}
            >
              {create.isPending ? "Saving…" : "Save Lead to CRM"}
            </Button>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
