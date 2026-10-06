"use client";

import type { Job } from "@/types";
import { Ico } from "@/components/ui/emoji-icon";
import { JOB_PROGRESS } from "@/lib/constants";

/** Replaces st.progress — driven by polling instead of a blocked script thread. */
export function JobProgress({ job }: { job: Job | undefined }) {
  if (!job) return null;

  if (job.status === "error") {
    // Never job.error itself (user report, 2026-10-06): that's the raw str(exc) the backend caught --
    // for a SQL failure it can be the entire statement and every bound parameter, which is exactly what
    // got shown on screen once. The real detail is always in the server logs already; this one generic
    // line is all a rep ever needs to see here.
    if (job.error) console.error("Job failed:", job.error);
    return (
      <p
        className="rounded-[8px] px-3 py-2 text-[0.85rem]"
        style={{ background: "var(--danger-tint)", color: "var(--danger)" }}
      >
        {JOB_PROGRESS.genericError}
      </p>
    );
  }

  if (job.status === "done") {
    // Confirmed live 2026-09-17: this used to say "✅ Complete — {job.total}
    // leads processed", where job.total is the REQUESTED count set before
    // the run even started (ctx.progress(0, max_leads, ...)) -- it never
    // reflected whether anything was actually found/saved. A run that found
    // zero leads (e.g. Gemini's daily quota exhausted) still showed a green
    // "5 leads processed" success message directly above the red "No
    // companies found" error every caller already renders from job.result,
    // a visibly contradictory pair. This job only ran to completion without
    // crashing -- the actual outcome belongs to whichever result summary
    // reads job.result right after this component, in every caller.
    return <p className="text-[0.85rem] text-success"><Ico e="✅" /> Job finished.</p>;
  }

  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-input">
        <div className="h-full bg-accent transition-all" style={{ width: `${job.progress}%` }} />
      </div>
      <p className="mt-1 text-[0.78rem] text-muted">
        {job.current}/{job.total} — {job.message}
      </p>
    </div>
  );
}
