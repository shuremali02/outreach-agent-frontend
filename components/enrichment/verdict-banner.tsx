import type { ScanResult } from "@/types";
import { resolveVerdict } from "@/lib/verdict";
import { SITE_SCAN } from "@/lib/constants";
import { externalUrl } from "@/lib/format";
import { withIcons } from "@/components/ui/emoji-icon";

/**
 * app.py:996-1027 — agent_core.site_matches_lead() rendered as the four states.
 *
 * Two behaviours carried over deliberately:
 *
 *  - `blocked` (403, Cloudflare, captcha) is a SUCCESSFUL scan with error === "".
 *    Collapsing it into a generic failure loses the "says nothing about lead
 *    quality" point, and a rep bins a perfectly good company.
 *  - an `error` renders as a caption ABOVE the verdict, not instead of it. The
 *    Streamlit version still shows the signals line underneath, because a
 *    timeout usually still leaves an "unknown" verdict worth reading.
 *
 * The verdict itself comes from the backend when the scan is fresh; see
 * lib/verdict.ts.
 */
export function VerdictBanner({
  scan,
  companyName,
  website,
}: {
  scan: ScanResult;
  companyName: string;
  website: string;
}) {
  const { verdict, detail } = resolveVerdict(scan, companyName);

  return (
    <div className="flex flex-col gap-1.5">
      {scan.error && (
        <p className="text-[0.78rem] text-muted">{withIcons(SITE_SCAN.scanIssue(scan.error))}</p>
      )}

      {verdict === "blocked" && (
        <p
          className="rounded-[8px] px-3 py-2 text-[0.85rem]"
          style={{ background: "var(--warn-tint)", color: "var(--warn)" }}
        >
          {withIcons(SITE_SCAN.blocked(scan.http_status, detail))}
          {website && (
            <>
              {withIcons(SITE_SCAN.blockedLinkPrefix)}
              <a
                href={externalUrl(website)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {website}
              </a>
              {withIcons(SITE_SCAN.blockedLinkSuffix)}
            </>
          )}
        </p>
      )}

      {verdict === "mismatch" && (
        <p
          className="rounded-[8px] px-3 py-2 text-[0.85rem]"
          style={{ background: "var(--danger-tint)", color: "var(--danger)" }}
        >
          {withIcons(SITE_SCAN.mismatch(website, detail))}
        </p>
      )}

      {verdict !== "blocked" && verdict !== "mismatch" && (
        <div className="text-[0.85rem]">
          {scan.has_3d ? (
            <p className="text-text">
              <strong>{withIcons(SITE_SCAN.signalsLabel)}</strong>{" "}
              <code className="font-mono text-[0.8rem] text-accent">
                {scan.matched_signals.join(", ")}
              </code>{" "}
              — already has interactive tech.
            </p>
          ) : verdict === "unknown" ? (
            <p className="text-muted">
              <strong>{withIcons(SITE_SCAN.signalsLabel)}</strong> {SITE_SCAN.unknown}
            </p>
          ) : (
            <p className="text-text">
              <strong>{withIcons(SITE_SCAN.signalsLabel)}</strong> {SITE_SCAN.fit}
            </p>
          )}
          {scan.weak_signals.length > 0 && (
            <p className="mt-1 text-[0.78rem] text-muted">
              {withIcons(SITE_SCAN.weakSignals(scan.weak_signals.join(", ")))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
