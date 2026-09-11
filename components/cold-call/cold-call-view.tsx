"use client";

import { useMemo, useState } from "react";
import { useLeads } from "@/hooks/use-leads";
import { Battlecard } from "./battlecard";
import { IngestDrawer } from "@/components/ingest/ingest-drawer";
import { CategoryPills } from "@/components/leads/category-pills";
import { TickerCard } from "@/components/metrics/ticker-card";
import { CALL_QUEUE_STAGES, ALL_CATEGORIES } from "@/lib/constants";
import { currency, num } from "@/lib/format";
import type { Lead } from "@/types";
import { EMPTY_STATES } from "@/lib/constants";

export function ColdCallView({ initialLeads, q }: { initialLeads: Lead[]; q: string }) {
  const { data: allLeads = [] } = useLeads({ q }, initialLeads);
  const [category, setCategory] = useState(ALL_CATEGORIES);

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
    () => (category === ALL_CATEGORIES ? queue : queue.filter((l) => l.industry_tag === category)),
    [queue, category],
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

      <div className="mb-4">
        <CategoryPills leads={queue} selected={category} onSelect={setCategory} />
      </div>

      {filtered.length === 0 && (
        <p
          className="rounded-[8px] px-3 py-2 text-[0.9rem]"
          style={{ background: "var(--info-tint)", color: "var(--info)" }}
        >
          {EMPTY_STATES.coldCallQueue}
        </p>
      )}

      {filtered.map((lead) => (
        <Battlecard key={lead.id} lead={lead} />
      ))}
    </>
  );
}
