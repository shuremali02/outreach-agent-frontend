"use client";

import { useMemo, useState } from "react";
import { useLeads } from "@/hooks/use-leads";
import { Battlecard } from "./battlecard";
// Re-enabled: the CSV Import tab is how a spreadsheet gets uploaded +
// enriched (File > Download > CSV from Google Sheets/Excel, then drop the
// .csv here). Its own Apollo tab stays commented out inside
// ingest-drawer.tsx (no paid key, not used) -- only "AI Discovery" and "CSV
// Import" render now.
import { IngestDrawer } from "@/components/ingest/ingest-drawer";
import { TickerCard } from "@/components/metrics/ticker-card";
import { Field, Select } from "@/components/ui/input";
import {
  CALL_QUEUE_STAGES,
  ALL_CATEGORIES,
  ALL_COUNTRIES,
  ALL_SOURCES,
  UNKNOWN_COUNTRY,
  STANDARD_CATEGORIES,
  COUNTRIES,
  LEAD_SOURCE_LABELS,
  COLD_CALL_QUEUE,
} from "@/lib/constants";
import { currency, leadSource, num } from "@/lib/format";
import type { Lead } from "@/types";
import { EMPTY_STATES } from "@/lib/constants";

export function ColdCallView({ initialLeads, q }: { initialLeads: Lead[]; q: string }) {
  const { data: allLeads = [] } = useLeads({ q }, initialLeads);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [country, setCountry] = useState(ALL_COUNTRIES);
  // Derived from source_prompt (leadSource()), not a real backend filter --
  // filtered client-side same as category/country here.
  const [source, setSource] = useState(ALL_SOURCES);

  // Confirmed live 2026-09-18: a disposition on a lead already in the
  // Follow-up section (e.g. a 2nd Voicemail) keeps it at followup_due --
  // same section, same position, nothing visibly changes -- so a rep had no
  // way to tell the click actually registered, and sometimes pressed it
  // again. Any disposition now hides that lead from this view immediately,
  // regardless of which stage it lands in server-side; a real refetch would
  // otherwise just bring an unresolved follow-up right back.
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  function dismiss(leadId: number) {
    setDismissed((prev) => (prev.has(leadId) ? prev : new Set(prev).add(leadId)));
  }

  /** app.py: draft_ready|followup_due, excluding dead numbers. */
  const queue = useMemo(
    () =>
      allLeads.filter(
        (l) =>
          CALL_QUEUE_STAGES.includes(l.pipeline_stage) && l.phone_status !== "dead_disconnected",
      ),
    [allLeads],
  );

  const filtered = useMemo(
    () =>
      queue.filter(
        (l) =>
          !dismissed.has(l.id) &&
          (category === ALL_CATEGORIES || l.industry_tag === category) &&
          (country === ALL_COUNTRIES ||
            (country === UNKNOWN_COUNTRY ? !l.country : l.country === country)) &&
          (source === ALL_SOURCES || leadSource(l.source_prompt) === source),
      ),
    [queue, dismissed, category, country, source],
  );

  // Split, not one flat list: a lead already called once (voicemail/callback
  // -> followup_due) stays in this same queue forever, mixed in with leads
  // that have never been called (draft_ready) -- with a large queue that
  // makes a handful of brand-new leads impossible to spot. New leads sort
  // newest-first so the latest batch is always at the top; follow-ups sort
  // oldest-touched-first so the longest-overdue callback surfaces first.
  const newLeads = useMemo(
    () =>
      filtered
        .filter((l) => l.pipeline_stage === "draft_ready")
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [filtered],
  );
  const followUps = useMemo(
    () =>
      filtered
        .filter((l) => l.pipeline_stage === "followup_due")
        .sort((a, b) => a.updated_at.localeCompare(b.updated_at)),
    [filtered],
  );

  const verifiedLines = queue.filter(
    (l) => l.phone_status === "verified_direct" && l.contact_phone,
  ).length;
  const queueValue = queue.reduce((s, l) => s + l.deal_value, 0);

  return (
    <>
      <IngestDrawer />

      <div className="mb-5 grid grid-cols-4 gap-3">
        <TickerCard label="Call-Ready Queue" value={num(queue.length)} size="md" />
        <TickerCard
          label="Verified Direct Lines"
          value={num(verifiedLines)}
          size="md"
          valueColor="success"
        />
        <TickerCard
          label="Queue Pipeline Value"
          value={currency(queueValue)}
          size="md"
          valueColor="accent"
        />
        <TickerCard label="Dialing Efficiency" value="0s" size="md" valueColor="info" />
      </div>

      <div className="mb-4 grid grid-cols-3 gap-4">
        <Field label="Category Filter">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value={ALL_CATEGORIES}>{ALL_CATEGORIES}</option>
            {STANDARD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Country Filter">
          <Select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value={ALL_COUNTRIES}>{ALL_COUNTRIES}</option>
            <option value={UNKNOWN_COUNTRY}>🏳️ Unknown</option>
            {COUNTRIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Source Filter">
          <Select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value={ALL_SOURCES}>{ALL_SOURCES}</option>
            {Object.entries(LEAD_SOURCE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {filtered.length === 0 && (
        <p
          className="rounded-[8px] px-3 py-2 text-[0.9rem]"
          style={{ background: "var(--info-tint)", color: "var(--info)" }}
        >
          {EMPTY_STATES.coldCallQueue}
        </p>
      )}

      {newLeads.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-[1.05rem] font-semibold">
            {COLD_CALL_QUEUE.newHeading(newLeads.length)}
          </h3>
          {newLeads.map((lead) => (
            <Battlecard key={lead.id} lead={lead} onActionTaken={dismiss} />
          ))}
        </div>
      )}

      {followUps.length > 0 && (
        <div>
          <h3 className="mb-2 text-[1.05rem] font-semibold">
            {COLD_CALL_QUEUE.followUpHeading(followUps.length)}
          </h3>
          {followUps.map((lead) => (
            <Battlecard key={lead.id} lead={lead} onActionTaken={dismiss} />
          ))}
        </div>
      )}
    </>
  );
}
