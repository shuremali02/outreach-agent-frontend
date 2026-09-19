"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsApi } from "@/lib/api";
import { useJob } from "@/hooks/use-job";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { LeadCountSlider } from "@/components/ingest/lead-count-slider";
import { JobProgress } from "@/components/ingest/job-progress";
import { Card } from "@/components/ui/card";
import { TabButton } from "@/components/common/tab-button";
import { COUNTRIES, LEAD_FINDER, MAPS_FINDER, QUALIFY, STANDARD_CATEGORIES } from "@/lib/constants";
import { QualifySummary } from "./qualify-summary";
import type { DiscoverJobResult, QualifyJobResult } from "@/types";

/**
 * /jobs/discover result -- a single ungrounded Gemini pass that saves
 * whatever it finds (no reject-if-unverified stage, unlike QualifySummary's
 * funnel). Deliberately the fast/simple path: "just get me leads."
 */
function DiscoverSummary({ result }: { result: DiscoverJobResult }) {
  if (result.error && !result.saved) {
    return (
      <p
        className="rounded-[8px] px-3 py-2 text-[0.85rem]"
        style={{ background: "var(--danger-tint)", color: "var(--danger)" }}
      >
        {result.error}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1 text-[0.85rem]">
      <p className="text-success">
        {result.saved > 0 ? LEAD_FINDER.success(result.saved) : LEAD_FINDER.empty}
      </p>
      {result.skipped_duplicates.length > 0 && (
        <p className="text-muted">{LEAD_FINDER.skipped(result.skipped_duplicates.length)}</p>
      )}
    </div>
  );
}

export function DiscoveryForm() {
  const qc = useQueryClient();
  const [source, setSource] = useState<"ai" | "maps">("ai");

  // AI web-search discovery.
  // app.py:2364 uses a placeholder, not a value — this field starts EMPTY.
  const [prompt, setPrompt] = useState("");

  // Google Maps sourcing.
  const [mapsQuery, setMapsQuery] = useState("");
  const [category, setCategory] = useState<string>(STANDARD_CATEGORIES[0]);
  const [keepCallOnly, setKeepCallOnly] = useState(false);

  // Country constraint -- shared by both tabs. "" = no constraint (worldwide
  // for Maps, unconstrained for the AI prompt).
  const [country, setCountry] = useState("");

  const [count, setCount] = useState(5);
  const [jobId, setJobId] = useState<string | null>(null);

  const { data: job } = useJob(jobId);

  const start = useMutation({
    mutationFn: () =>
      source === "maps"
        ? jobsApi.qualifyMaps({
            maps_query: mapsQuery, industry_tag: category, max_leads: count, country,
            keep_call_only: keepCallOnly,
          })
        // Plain discovery, not the qualify funnel: one Gemini pass, saved
        // straight away, no per-company scan/contact-verify/reject stage.
        // "Google Maps" stays on the qualify funnel on purpose -- that path's
        // whole point is verifying what Places returns.
        : jobsApi.start("discover", { prompt, max_leads: count, country }),
    onSuccess: (j) => setJobId(j.job_id),
  });

  // Effect, not render-time: invalidating during render re-fires every tick.
  const done = job?.status === "done";
  useEffect(() => {
    if (done) {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["metrics"] });
    }
  }, [done, qc]);

  const running =
    start.isPending || (job != null && job.status !== "done" && job.status !== "error");
  const result = done ? job?.result : undefined;
  // `result`'s static type is `unknown` (Job<TResult = unknown>), so
  // `result && ...` in JSX makes the falsy branch's type `unknown` too,
  // which TS refuses as a ReactNode. A boolean-typed guard avoids that.
  const hasResult = result !== undefined;
  const ready = source === "maps" ? mapsQuery.trim().length > 0 : prompt.trim().length > 0;

  return (
    <Card className="max-w-3xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) start.mutate();
        }}
        className="flex flex-col gap-4"
      >
        <Tabs.Root value={source} onValueChange={(v) => setSource(v as "ai" | "maps")}>
          <Tabs.List className="mb-1 flex gap-2">
            <TabButton value="ai">{MAPS_FINDER.sourceAi}</TabButton>
            <TabButton value="maps">{MAPS_FINDER.sourceMaps}</TabButton>
          </Tabs.List>
        </Tabs.Root>

        {source === "ai" ? (
          <>
            <Field label={LEAD_FINDER.label}>
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={LEAD_FINDER.placeholder}
                maxLength={2000}
                required
              />
            </Field>
            <Field label={LEAD_FINDER.countryLabel}>
              <Select value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">{LEAD_FINDER.countryAny}</option>
                {COUNTRIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        ) : (
          <>
            <Field label={MAPS_FINDER.queryLabel}>
              <Input
                value={mapsQuery}
                onChange={(e) => setMapsQuery(e.target.value)}
                placeholder={MAPS_FINDER.queryPlaceholder}
                maxLength={300}
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Industry Category">
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {STANDARD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={LEAD_FINDER.countryLabel}>
                <Select value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="">{LEAD_FINDER.countryAny}</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <label
              className="flex cursor-pointer items-center gap-2 text-[0.85rem]"
              title={MAPS_FINDER.callOnlyHelp}
            >
              <input
                type="checkbox"
                checked={keepCallOnly}
                onChange={(e) => setKeepCallOnly(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              {MAPS_FINDER.callOnlyLabel}
            </label>
          </>
        )}

        <LeadCountSlider
          label={LEAD_FINDER.sliderLabel}
          value={count}
          onChange={setCount}
          min={1}
          max={10}
          showQuotaCaption={false}
        />

        <p className="text-[0.8rem] text-muted">
          {source === "maps" ? MAPS_FINDER.note : QUALIFY.note}
        </p>

        <Button type="submit" variant="primary" disabled={running || !ready}>
          {running ? QUALIFY.running : source === "maps" ? MAPS_FINDER.button : LEAD_FINDER.button}
        </Button>

        <JobProgress job={job} />

        {hasResult && source === "maps" && <QualifySummary result={result as QualifyJobResult} />}
        {hasResult && source === "ai" && <DiscoverSummary result={result as DiscoverJobResult} />}
      </form>
    </Card>
  );
}
