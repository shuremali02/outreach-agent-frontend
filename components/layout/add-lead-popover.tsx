"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { leadsApi } from "@/lib/api";
import { COUNTRIES, PIPELINE_STAGES, STANDARD_CATEGORIES } from "@/lib/constants";
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
  industry_tag: STANDARD_CATEGORIES[5],
  pipeline_stage: "draft_ready",
  reason: "",
};

export function AddLeadPopover() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateLeadInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (input: CreateLeadInput) => leadsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["metrics"] });
      setForm(EMPTY);
      setError(null);
      setOpen(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  function set<K extends keyof CreateLeadInput>(key: K, value: CreateLeadInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

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
              create.mutate(form);
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="Industry Category">
                <Select
                  value={form.industry_tag}
                  onChange={(e) => set("industry_tag", e.target.value)}
                >
                  {STANDARD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Country">
                <Select value={form.country} onChange={(e) => set("country", e.target.value)}>
                  <option value="">Not specified</option>
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

            <Button type="submit" variant="primary" block disabled={create.isPending}>
              {create.isPending ? "Saving…" : "Save Lead to CRM"}
            </Button>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
