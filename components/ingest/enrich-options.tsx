"use client";

import { ENRICH_OPTIONS } from "@/lib/constants";

/** app.py:1717-1719 — the scan/enrich checkbox pair shared by the CSV and Apollo tabs. */
export function EnrichOptions({
  scrape,
  enrich,
  onScrape,
  onEnrich,
}: {
  scrape: boolean;
  enrich: boolean;
  onScrape: (v: boolean) => void;
  onEnrich: (v: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label
        className="flex cursor-pointer items-center gap-2 text-[0.85rem]"
        title={ENRICH_OPTIONS.scrapeHelp}
      >
        <input
          type="checkbox"
          checked={scrape}
          onChange={(e) => onScrape(e.target.checked)}
          className="accent-[var(--accent)]"
        />
        {ENRICH_OPTIONS.scrapeLabel}
      </label>
      <label
        className="flex cursor-pointer items-center gap-2 text-[0.85rem]"
        title={ENRICH_OPTIONS.enrichHelp}
      >
        <input
          type="checkbox"
          checked={enrich}
          onChange={(e) => onEnrich(e.target.checked)}
          className="accent-[var(--accent)]"
        />
        {ENRICH_OPTIONS.enrichLabel}
      </label>
    </div>
  );
}
