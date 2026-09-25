"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { enrichmentApi } from "@/lib/api";
import { useJob } from "@/hooks/use-job";
import { useFullLead } from "@/hooks/use-leads";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { VerdictBanner } from "./verdict-banner";
import { ScreenshotViewer } from "./screenshot-viewer";
import type { Lead, ScanResult } from "@/types";
import { EMPTY_STATES, SITE_SCAN, TOASTS } from "@/lib/constants";
import { withIcons } from "@/components/ui/emoji-icon";

/**
 * render_site_scan_ui — Scan site + Deep enrich, the verdict banner, product
 * intel and the screenshot toggle. Used on Today, Cold Call, Pipeline, Contacts.
 *
 * The scan runs as a polled background job rather than blocking, because
 * scraper.scan_site() can take up to ~98s.
 */
export function SiteScanPanel({ lead: listLead }: { lead: Lead }) {
  // product_description (the persisted-scan fallback below) is not in a slim list row -- see useFullLead().
  const { lead } = useFullLead(listLead);
  const qc = useQueryClient();
  const toast = useToast();
  const [jobId, setJobId] = useState<string | null>(null);

  const start = useMutation({
    mutationFn: () => enrichmentApi.startScan(lead.id),
    onSuccess: (job) => setJobId(job.job_id),
  });

  const enrich = useMutation({
    mutationFn: () => enrichmentApi.deepEnrich(lead.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success(TOASTS.enrichDone);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
  });

  const findWebsite = useMutation({
    mutationFn: () => enrichmentApi.findWebsite(lead.id),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      if (updated?.company_website) toast.success(TOASTS.websiteFound(lead.company_name));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
  });

  const { data: job } = useJob(jobId);

  // Derived, not stored — polling already stops once the job is terminal.
  const scan = job?.status === "done" && job.result ? (job.result as ScanResult) : null;

  // Effect only touches an external system (the query cache), never local state.
  const scanDone = job?.status === "done";
  useEffect(() => {
    if (scanDone) {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success(TOASTS.scanDone);
    }
  }, [scanDone, qc, toast]);

  // Fall back to the columns already persisted on the lead, as app.py did.
  const effective: ScanResult | null =
    scan ??
    (lead.product_title || lead.product_description || lead.matched_signals.length
      ? {
          has_3d: lead.has_3d,
          matched_signals: lead.matched_signals,
          weak_signals: [],
          product_title: lead.product_title,
          product_description: lead.product_description,
          screenshot_path: lead.screenshot_path,
          http_status: 200,
          blocked: false,
          error: "",
        }
      : null);

  const scanning = start.isPending || (job != null && job.status !== "done" && job.status !== "error");

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {lead.company_website ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => start.mutate()}
            loading={scanning}
          >
            {scanning ? "Scanning…" : "🔍 Scan site (3D / product intel)"}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => findWebsite.mutate()}
            loading={findWebsite.isPending}
            title={EMPTY_STATES.noWebsite}
          >
            {findWebsite.isPending ? "Searching…" : "🔎 Find website (Google Maps)"}
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => enrich.mutate()}
          loading={enrich.isPending}
        >
          {enrich.isPending ? "Enriching…" : "✨ Deep enrich (Hunter + SignalHire)"}
        </Button>
      </div>

      {findWebsite.isSuccess && !findWebsite.data?.company_website && (
        <p className="text-[0.8rem] text-muted">{withIcons(EMPTY_STATES.websiteNotFound)}</p>
      )}
      {findWebsite.isError && (
        <p className="text-[0.8rem] text-danger">
          {withIcons(findWebsite.error instanceof Error ? findWebsite.error.message : EMPTY_STATES.websiteNotFound)}
        </p>
      )}

      {scanning && job && (
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-input">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${job.progress}%` }}
            />
          </div>
          <p className="mt-1 text-[0.75rem] text-muted">{job.message}</p>
        </div>
      )}

      {job?.status === "error" && <p className="text-[0.8rem] text-danger">{job.error}</p>}

      {enrich.isSuccess && (
        <p className="text-[0.8rem] text-success">{withIcons(SITE_SCAN.enrichComplete)}</p>
      )}
      {enrich.isError && (
        <p className="text-[0.8rem] text-danger">
          {withIcons(enrich.error instanceof Error ? enrich.error.message : SITE_SCAN.enrichFailed)}
        </p>
      )}

      {effective && (
        <>
          <VerdictBanner
            scan={effective}
            companyName={lead.company_name}
            website={lead.company_website}
          />
          {effective.product_title.length > 3 && (
            <p className="text-[0.85rem]">
              <strong>{withIcons(SITE_SCAN.productLabel)}</strong> {effective.product_title}
            </p>
          )}
          {effective.product_description.length > 12 && (
            <p className="text-[0.78rem] text-muted">{effective.product_description}</p>
          )}
          <ScreenshotViewer
            src={effective.screenshot_path}
            alt={`Screenshot of ${lead.company_name}`}
          />
        </>
      )}
    </div>
  );
}
