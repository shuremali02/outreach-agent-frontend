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
import { CategoryPills } from "@/components/leads/category-pills";
import { CountryPills } from "@/components/leads/country-pills";
import { TickerCard } from "@/components/metrics/ticker-card";
import {
  CALL_QUEUE_STAGES,
  ALL_CATEGORIES,
  ALL_COUNTRIES,
  UNKNOWN_COUNTRY,
  COLD_CALL_QUEUE,
} from "@/lib/constants";
import { currency, num } from "@/lib/format";
import type { Lead } from "@/types";
import { EMPTY_STATES } from "@/lib/constants";

export function ColdCallView({ initialLeads, q }: { initialLeads: Lead[]; q: string }) {
  const { data: allLeads = [] } = useLeads({ q }, initialLeads);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [country, setCountry] = useState(ALL_COUNTRIES);

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
          (category === ALL_CATEGORIES || l.industry_tag === category) &&
          (country === ALL_COUNTRIES ||
            (country === UNKNOWN_COUNTRY ? !l.country : l.country === country)),
      ),
    [queue, category, country],
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

      <div className="mb-2">
        <CategoryPills leads={queue} selected={category} onSelect={setCategory} />
      </div>
      <div className="mb-4">
        <CountryPills leads={queue} selected={country} onSelect={setCountry} />
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
            <Battlecard key={lead.id} lead={lead} />
          ))}
        </div>
      )}

      {followUps.length > 0 && (
        <div>
          <h3 className="mb-2 text-[1.05rem] font-semibold">
            {COLD_CALL_QUEUE.followUpHeading(followUps.length)}
          </h3>
          {followUps.map((lead) => (
            <Battlecard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </>
  );
}
