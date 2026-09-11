"use client";

import type { Job } from "@/types";

/** Replaces st.progress — driven by polling instead of a blocked script thread. */
export function JobProgress({ job }: { job: Job | undefined }) {
  if (!job) return null;

  if (job.status === "error") {
    return (
      <p
        className="rounded-[8px] px-3 py-2 text-[0.85rem]"
        style={{ background: "var(--danger-tint)", color: "var(--danger)" }}
      >
        {job.error}
      </p>
    );
  }

  if (job.status === "done") {
    return <p className="text-[0.85rem] text-success">✅ Complete — {job.total} leads processed.</p>;
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
