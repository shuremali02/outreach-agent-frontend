"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsApi } from "@/lib/api";
import { useJob } from "@/hooks/use-job";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { LeadCountSlider } from "./lead-count-slider";
import { EnrichOptions } from "./enrich-options";
import { JobProgress } from "./job-progress";
import { TabButton } from "@/components/common/tab-button";
import {
  AI_DISCOVERY,
  // APOLLO_IMPORT, -- only used by the commented-out Apollo tab below
  CSV_IMPORT,
  INGEST_TABS,
  INGEST_TITLE,
} from "@/lib/constants";
import type { DiscoverJobResult, ImportJobResult, Job } from "@/types";

function useJobRunner() {
  const qc = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const { data: job } = useJob(jobId);

  const start = useMutation({
    mutationFn: (fn: () => Promise<Job>) => fn(),
    onSuccess: (j) => setJobId(j.job_id),
  });

  // Effect, not render-time: invalidating during render re-fires on every
  // subsequent render while status stays "done" (see discovery-form.tsx's
  // identical guard) -- a self-sustaining refetch loop otherwise.
  const done = job?.status === "done";
  useEffect(() => {
    if (done) {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["metrics"] });
    }
  }, [done, qc]);

  const running = start.isPending || (job != null && job.status !== "done" && job.status !== "error");
  return { job, start, running };
}

export function IngestDrawer() {
  const [open, setOpen] = useState(false);

  // Free AI discovery
  const [aiPrompt, setAiPrompt] = useState<string>(AI_DISCOVERY.defaultValue);
  const [aiCount, setAiCount] = useState(8);
  const ai = useJobRunner();

  // Apollo tab commented out (see the TabButton/Tabs.Content below and
  // cold-call-view.tsx) -- no paid Apollo key, not used. Uncomment this
  // block together with them to bring it back.
  // const [apolloPrompt, setApolloPrompt] = useState<string>(APOLLO_IMPORT.defaultValue);
  // const [apolloLimit, setApolloLimit] = useState(30);
  // const [apolloKey, setApolloKey] = useState("");
  // const [apolloScrape, setApolloScrape] = useState(false);
  // const [apolloEnrich, setApolloEnrich] = useState(false);
  // const apollo = useJobRunner();

  // CSV
  const [csvText, setCsvText] = useState("");
  const [csvName, setCsvName] = useState("");
  const [csvScrape, setCsvScrape] = useState(false);
  const [csvEnrich, setCsvEnrich] = useState(false);
  const csv = useJobRunner();

  // Header row excluded, clamped to the 300 the importer accepts.
  const csvRows = csvText
    ? Math.min(300, Math.max(0, csvText.split("\n").filter(Boolean).length - 1))
    : 0;

  return (
    <div className="mb-5">
      {/* Collapsed by default, as in app.py (expanded=False), but rendered as a
          real button rather than expander text so it reads as clickable. */}
      <Button variant="secondary" onClick={() => setOpen((v) => !v)}>
        {INGEST_TITLE}
        <span className="text-muted">{open ? "▲" : "▼"}</span>
      </Button>

      {open && (
        <div className="mt-3 rounded-[12px] border border-border bg-card p-5">
          <Tabs.Root defaultValue="ai">
            <Tabs.List className="mb-4 flex gap-2">
              <TabButton value="ai">{INGEST_TABS.ai}</TabButton>
              <TabButton value="csv">{INGEST_TABS.csv}</TabButton>
              {/* <TabButton value="apollo">{INGEST_TABS.apollo}</TabButton> -- see commented state above */}
            </Tabs.List>

            <Tabs.Content value="ai" className="flex flex-col gap-3">
              <p className="text-[0.85rem] text-muted">{AI_DISCOVERY.intro}</p>
              <Field label={AI_DISCOVERY.label}>
                <Input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} maxLength={2000} />
              </Field>
              <LeadCountSlider
                label={AI_DISCOVERY.sliderLabel}
                value={aiCount}
                onChange={setAiCount}
              />
              <Button
                variant="primary"
                loading={ai.running}
                disabled={!aiPrompt.trim()}
                onClick={() =>
                  ai.start.mutate(() => jobsApi.start("discover", { prompt: aiPrompt, max_leads: aiCount }))
                }
              >
                {ai.running ? "Discovering…" : AI_DISCOVERY.button}
              </Button>
              <JobProgress job={ai.job} />
              {ai.job?.status === "done" &&
                (() => {
                  const result = ai.job!.result as DiscoverJobResult | undefined;
                  // Same check as discovery-form.tsx's DiscoverSummary --
                  // this tab used to always print the green success/empty
                  // text on "done", even when the whole Gemini+Groq cascade
                  // failed and result.error carried the real reason
                  // (confirmed live 2026-09-18 via a Cold Call Desk run that
                  // hit 504/503/503/503/429 across every model and showed
                  // the misleading "Found no new companies" message).
                  if (result?.error && !result.saved) {
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
                    <p className="text-[0.85rem] text-success">
                      {result?.saved ? AI_DISCOVERY.success(result.saved) : AI_DISCOVERY.empty}
                    </p>
                  );
                })()}
            </Tabs.Content>

            <Tabs.Content value="csv" className="flex flex-col gap-3">
              <p className="text-[0.85rem] text-muted">{CSV_IMPORT.intro}</p>
              <Field label={CSV_IMPORT.label}>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setCsvName(file.name);
                    setCsvText(await file.text());
                  }}
                  className="w-full rounded-[8px] border border-border bg-input px-3 py-2 text-[0.85rem]"
                />
              </Field>
              {csvName && (
                <p className="text-[0.82rem] text-muted">
                  Loaded <strong className="text-text">{csvName}</strong> —{" "}
                  {csvRows} rows detected.
                </p>
              )}
              <EnrichOptions
                scrape={csvScrape}
                enrich={csvEnrich}
                onScrape={setCsvScrape}
                onEnrich={setCsvEnrich}
              />
              <Button
                variant="primary"
                loading={csv.running}
                disabled={!csvText}
                onClick={() =>
                  csv.start.mutate(() =>
                    jobsApi.start("import", {
                      source: "csv",
                      scrape: csvScrape,
                      enrich: csvEnrich,
                      payload: csvText,
                      limit: Math.max(1, csvRows),
                    }),
                  )
                }
              >
                {csv.running ? "Processing…" : CSV_IMPORT.button(csvRows)}
              </Button>
              <JobProgress job={csv.job} />
              {csv.job?.status === "done" && (
                <p className="text-[0.85rem] text-success">
                  {CSV_IMPORT.success((csv.job.result as ImportJobResult | undefined)?.inserted ?? 0)}
                </p>
              )}
            </Tabs.Content>

            {/* Apollo tab commented out -- no paid key, not used. Uncomment
                together with the TabButton above and the state block near
                the top of this component to bring it back.
            <Tabs.Content value="apollo" className="flex flex-col gap-3">
              <p className="text-[0.85rem] text-muted">{APOLLO_IMPORT.intro}</p>
              <p
                className="rounded-[8px] px-3 py-2 text-[0.82rem]"
                style={{ background: "var(--info-tint)", color: "var(--info)" }}
              >
                {APOLLO_IMPORT.notice}
              </p>
              <div className="grid grid-cols-[3fr_1.2fr] gap-3">
                <Field label={APOLLO_IMPORT.label}>
                  <Input value={apolloPrompt} onChange={(e) => setApolloPrompt(e.target.value)} />
                </Field>
                <LeadCountSlider
                  label={APOLLO_IMPORT.sliderLabel}
                  value={apolloLimit}
                  onChange={setApolloLimit}
                  min={10}
                  max={100}
                  step={10}
                  showQuotaCaption={false}
                />
              </div>
              <Field label={APOLLO_IMPORT.keyLabel}>
                <Input
                  type="password"
                  value={apolloKey}
                  onChange={(e) => setApolloKey(e.target.value)}
                  placeholder={APOLLO_IMPORT.keyPlaceholder}
                  title={APOLLO_IMPORT.keyHelp}
                  autoComplete="off"
                />
              </Field>
              <EnrichOptions
                scrape={apolloScrape}
                enrich={apolloEnrich}
                onScrape={setApolloScrape}
                onEnrich={setApolloEnrich}
              />
              <Button
                variant="primary"
                disabled={apollo.running}
                onClick={() =>
                  apollo.start.mutate(() =>
                    jobsApi.start("import", {
                      source: "apollo",
                      scrape: apolloScrape,
                      enrich: apolloEnrich,
                      payload: apolloPrompt,
                      limit: apolloLimit,
                      api_key: apolloKey.trim() || undefined,
                    }),
                  )
                }
              >
                {apollo.running ? "Fetching…" : APOLLO_IMPORT.button}
              </Button>
              <JobProgress job={apollo.job} />
              {apollo.job?.status === "done" && (
                <p className="text-[0.85rem] text-success">
                  {APOLLO_IMPORT.success(
                    (apollo.job.result as ImportJobResult | undefined)?.inserted ?? 0,
                  )}
                </p>
              )}
            </Tabs.Content>
            */}
          </Tabs.Root>
        </div>
      )}
    </div>
  );
}
