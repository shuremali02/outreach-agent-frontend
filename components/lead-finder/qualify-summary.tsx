import { MAPS_FINDER, QUALIFY } from "@/lib/constants";
import type { QualifyJobResult } from "@/types";

/**
 * The result of a /jobs/qualify run. The rejected list is the point: it shows
 * that the agent researched real companies and turned some away, rather than
 * silently saving whatever a model produced.
 */
export function QualifySummary({ result }: { result: QualifyJobResult }) {
  if (result.error && result.qualified === 0) {
    return (
      <p
        className="rounded-[8px] px-3 py-2 text-[0.85rem]"
        style={{ background: "var(--danger-tint)", color: "var(--danger)" }}
      >
        {result.error}
      </p>
    );
  }

  // Defensive, not just the discovery-form.tsx tab-switch fix (2026-09-30, "result.rejected is not
  // iterable" crashed the whole page): a result missing these arrays should degrade to "nothing rejected"
  // here, never crash the page.
  const rejected = result.rejected ?? [];
  const skippedDuplicates = result.skipped_duplicates ?? [];

  const byStage = new Map<string, string[]>();
  for (const r of rejected) {
    const list = byStage.get(r.stage) ?? [];
    list.push(r.company);
    byStage.set(r.stage, list);
  }

  return (
    <div className="flex flex-col gap-2 text-[0.85rem]">
      {(result.provider || result.model) && (
        <p className="text-muted">{QUALIFY.provider(result.provider, result.model)}</p>
      )}

      <p className="text-success">{QUALIFY.qualified(result.qualified)}</p>

      {skippedDuplicates.length > 0 && (
        <p className="text-muted">{QUALIFY.skipped(skippedDuplicates.length)}</p>
      )}

      {Boolean(result.no_website_count) && (
        <p className="text-muted">{MAPS_FINDER.droppedNoWebsite(result.no_website_count!)}</p>
      )}

      {result.qualified === 0 && rejected.length === 0 && (
        <p className="text-muted">{QUALIFY.noResults}</p>
      )}

      {rejected.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-muted">{QUALIFY.rejectedHeading(rejected.length)}</p>
          <ul className="flex flex-col gap-1">
            {[...byStage.entries()].map(([stage, companies]) => (
              <li key={stage} className="text-[0.82rem]">
                <span className="text-danger">{QUALIFY.stageLabels[stage] ?? stage}</span>
                <span className="text-muted"> — {companies.join(", ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
