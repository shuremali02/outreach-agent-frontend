import type { ScanResult, VerdictResult } from "@/types";

/**
 * Client-side fallback for agent_core.site_matches_lead().
 *
 * The backend runs the real thing and returns `verdict` / `verdict_detail` on a
 * fresh scan — prefer those. This only covers the other path: a lead whose scan
 * columns were persisted earlier, where no verdict was stored alongside them.
 *
 * It is deliberately weaker than the Python: it matches on the company name
 * only, not on INDUSTRY_KEYWORDS, so it can report "mismatch" where the server
 * would have said "match".
 */
export function verdictFor(scan: ScanResult, companyName: string): VerdictResult {
  const text = `${scan.product_title} ${scan.product_description}`.trim();

  // A refusal page proves nothing about the lead — check this BEFORE mismatch.
  if (scan.blocked) {
    return {
      verdict: "blocked",
      detail: `Site blocked the scanner (HTTP ${scan.http_status}) — this says nothing about whether the lead is good.`,
    };
  }
  if (text.length < 25) {
    return {
      verdict: "unknown",
      detail: "The page returned almost no readable text, so the scan is inconclusive.",
    };
  }
  const tokens = companyName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
  const haystack = text.toLowerCase();
  if (tokens.some((t) => haystack.includes(t))) {
    return { verdict: "match", detail: `The page mentions “${companyName}”.` };
  }
  return {
    verdict: "mismatch",
    detail: "This website does not match the lead — verify before calling or emailing.",
  };
}

/** Server verdict when the scan carried one, else the local heuristic. */
export function resolveVerdict(scan: ScanResult, companyName: string): VerdictResult {
  if (scan.verdict) {
    return { verdict: scan.verdict, detail: scan.verdict_detail ?? "" };
  }
  return verdictFor(scan, companyName);
}
