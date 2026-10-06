"use client";

import * as Popover from "@radix-ui/react-popover";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { leadsApi } from "@/lib/api";
import { ADD_LEAD_COUNTRIES, ADD_LEAD_TEAM, LINKEDIN_OWNERS, MEETING_BOOKING, MENTIONS, PIPELINE_STAGES, STANDARD_CATEGORIES, TOASTS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { MentionField } from "@/components/common/mention-field";
import { useUsers } from "@/hooks/use-users";
import { extractMentions } from "@/lib/mentions";
import type { CreateLeadInput, ExtraContactInput, PipelineStage } from "@/types";
import { Ico, stripEmoji } from "@/components/ui/emoji-icon";

/** A fresh, empty row for "+ Add Another Contact" -- a stable per-row id
 * (not the array index) keeps React's reconciliation correct if a middle
 * row gets removed. */
let nextContactRowId = 1;
function emptyContactRow(): ExtraContactInput & { _rowId: number } {
  return { _rowId: nextContactRowId++, name: "", role: "", email: "", phone: "", linkedin: "" };
}

const EMPTY: CreateLeadInput = {
  company_name: "",
  company_website: "",
  contact_name: "",
  contact_role: "",
  contact_email: "",
  contact_phone: "",
  country: "",
  // structure-plan.md Phase 8: default deal value is 10000 everywhere (was 18000 here).
  deal_value: 10000,
  // No default category -- was STANDARD_CATEGORIES[5] (Tech & Commercial),
  // which silently tagged a lead with the wrong category whenever a rep
  // didn't notice and change it. Blank forces an explicit, deliberate pick
  // (see the required-field validation below), same reasoning as country.
  industry_tag: "",
  pipeline_stage: "draft_ready",
  reason: "",
  linkedin_lead: false,
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
  // "+ Add Another Contact" -- extra people at the same company, each
  // becomes a lead_contacts child row (see api/leads.py create_lead()).
  const [extraContacts, setExtraContacts] = useState<(ExtraContactInput & { _rowId: number })[]>([]);
  const qc = useQueryClient();
  const toast = useToast();
  const { data: users = [] } = useUsers();

  // Live-typing duplicate check (user, 2026-10-06: "save button par nahi, name/website add karte hi hamein
  // bata de k yeh already hai, pura form bhar kar time na waste karna pade") -- debounced, best-effort
  // only: a failed/slow check never blocks typing or submitting, it just doesn't show a warning that run.
  // POST /leads below still enforces this for real on submit either way (the 409 branch), this is purely
  // an earlier heads-up.
  const [duplicateMatch, setDuplicateMatch] = useState<{ leadId: number; companyName: string } | null>(null);
  const duplicateCheckId = useRef(0);
  useEffect(() => {
    const name = form.company_name.trim();
    const website = (form.company_website || "").trim();
    const requestId = ++duplicateCheckId.current;
    const timer = setTimeout(() => {
      // Deliberately inside the timeout, not synchronously in the effect body (react-hooks/set-state-in-
      // effect flagged the first version of this) -- nothing to check yet, so no network call either.
      if (!name && !website) {
        setDuplicateMatch(null);
        return;
      }
      leadsApi
        .checkDuplicate(name, website)
        .then((res) => {
          if (requestId !== duplicateCheckId.current) return; // a newer keystroke already superseded this
          setDuplicateMatch(
            res.duplicate && res.lead_id !== undefined && res.company_name !== undefined
              ? { leadId: res.lead_id, companyName: res.company_name }
              : null,
          );
        })
        .catch(() => undefined);
    }, 400);
    return () => clearTimeout(timer);
  }, [form.company_name, form.company_website]);

  const create = useMutation({
    mutationFn: (input: CreateLeadInput) => leadsApi.create(input),
    onSuccess: (lead) => {
      toast.success(TOASTS.leadAdded(lead.company_name));
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["metrics"] });
      setForm(EMPTY);
      setMeetingDate("");
      setMeetingTime("");
      setExtraContacts([]);
      setDuplicateMatch(null);
      setError(null);
      setOpen(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  function setContactRow(rowId: number, field: keyof ExtraContactInput, value: string) {
    setExtraContacts((rows) => rows.map((r) => (r._rowId === rowId ? { ...r, [field]: value } : r)));
  }

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
          <Ico e="➕" /> Add a Lead
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          // Confirmed live 2026-09-18: with 2+ "+ Add Another Contact" rows
          // the form grows taller than the viewport, and this had no
          // max-height/overflow of its own -- the extra rows were just
          // clipped, with nothing on the page able to scroll to reach them.
          className="z-50 max-h-[85vh] w-[92vw] max-w-[420px] overflow-y-auto rounded-[12px] border border-border bg-card p-5 shadow-[var(--shadow-overlay)]"
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
                ...extractMentions(form.team_note ?? "", users),
                ...(meetingDate && meetingTime
                  ? { meeting_at: `${meetingDate}T${meetingTime}:00` }
                  : {}),
                // Blank rows (rep clicked "+" but never filled it in) are
                // dropped silently rather than blocking submit.
                extra_contacts: extraContacts
                  .filter((r) => r.name.trim())
                  .map((r): ExtraContactInput => ({
                    name: r.name,
                    role: r.role,
                    email: r.email,
                    phone: r.phone,
                    linkedin: r.linkedin,
                  })),
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
            {duplicateMatch && (
              <p
                className="rounded-[8px] px-3 py-2 text-[0.8rem]"
                style={{ background: "var(--warn-tint)", color: "var(--warn)" }}
              >
                <Ico e="⚠️" /> &quot;{duplicateMatch.companyName}&quot; is already in the CRM (lead #{duplicateMatch.leadId}).
              </p>
            )}
            {/* New isolated desk (user, 2026-10-05): picking this at add-time is the ONE way a lead ever
                lands on the LinkedIn tab instead of Cold Call Desk -- never shows on Contacts or Cold Call
                Desk until it's actually been actioned. See crud/leads.py's lead_channel. */}
            <label
              className="flex cursor-pointer items-center gap-2 rounded-[8px] border border-border bg-input px-3 py-2 text-[0.85rem]"
              title="Adds this lead to the LinkedIn tab instead of Cold Call Desk."
            >
              <input
                type="checkbox"
                checked={form.linkedin_lead ?? false}
                onChange={(e) => set("linkedin_lead", e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <Ico e="📇" /> This is a LinkedIn lead
            </label>
            {/* Whose LinkedIn outreach this came from (user, 2026-10-05) -- only shown/relevant once the
                checkbox above is picked. Optional: left blank, the lead just has no owner tag/filter hit. */}
            {form.linkedin_lead && (
              <Field label="LinkedIn Account">
                <Select
                  value={form.linkedin_owner ?? ""}
                  onChange={(e) => set("linkedin_owner", (e.target.value || undefined) as CreateLeadInput["linkedin_owner"])}
                >
                  <option value="">Select…</option>
                  {LINKEDIN_OWNERS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            {extraContacts.map((row, i) => (
              <div key={row._rowId} className="rounded-[8px] border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[0.78rem] font-semibold text-muted">Contact {i + 2}</p>
                  <button
                    type="button"
                    onClick={() => setExtraContacts((rows) => rows.filter((r) => r._rowId !== row._rowId))}
                    className="cursor-pointer text-[0.78rem] text-danger"
                  >
                    <Ico e="✕" /> Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Name">
                    <Input value={row.name} onChange={(e) => setContactRow(row._rowId, "name", e.target.value)} />
                  </Field>
                  <Field label="Role / Title">
                    <Input value={row.role} onChange={(e) => setContactRow(row._rowId, "role", e.target.value)} />
                  </Field>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Email">
                    <Input
                      type="email"
                      value={row.email}
                      onChange={(e) => setContactRow(row._rowId, "email", e.target.value)}
                    />
                  </Field>
                  <Field label="Phone">
                    <Input
                      type="tel"
                      value={row.phone}
                      onChange={(e) => setContactRow(row._rowId, "phone", e.target.value)}
                    />
                  </Field>
                </div>
                <div className="mt-3">
                  <Field label="LinkedIn URL">
                    <Input
                      value={row.linkedin}
                      onChange={(e) => setContactRow(row._rowId, "linkedin", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setExtraContacts((rows) => [...rows, emptyContactRow()])}
              className="cursor-pointer text-left text-[0.8rem] font-semibold text-accent"
            >
              + Add Another Contact
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      {stripEmoji(s.label)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {form.pipeline_stage === "meeting_booked" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      {stripEmoji(c)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Country *">
                <Select value={form.country} onChange={(e) => set("country", e.target.value)} required>
                  <option value="" disabled>
                    Select a country
                  </option>
                  {ADD_LEAD_COUNTRIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {stripEmoji(c.label)}
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

            <Field label={ADD_LEAD_TEAM.label}>
              <MentionField
                rows={2}
                value={form.team_note ?? ""}
                onChange={(v) => set("team_note", v)}
                placeholder={ADD_LEAD_TEAM.placeholder}
                maxLength={1000}
              />
              <p className="mt-1 text-[0.75rem] text-muted">{MENTIONS.hint}</p>
            </Field>

            {error && <p className="text-[0.8rem] text-danger">{error}</p>}

            <Button
              type="submit"
              variant="primary"
              block
              loading={create.isPending}
              disabled={needsMeetingTime || missingRequired}
            >
              {create.isPending ? "Saving…" : "Save Lead to CRM"}
            </Button>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
