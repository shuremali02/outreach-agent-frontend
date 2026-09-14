"use client";

import { useSystemStatus } from "@/hooks/use-metrics";
import type { SystemStatus } from "@/types";

/** 🟢 connected · 🔴 required but missing · ⚪ optional and not configured */
function Row({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <p className="text-[0.78rem] leading-6 text-muted">
      <span aria-hidden>{dot}</span>{" "}
      <span className="font-bold text-text">{label}:</span> {value}
    </p>
  );
}

export function SystemStatusPanel({ initialData }: { initialData?: SystemStatus }) {
  const { data } = useSystemStatus(initialData);

  if (!data) {
    return <p className="text-[0.78rem] text-muted">Checking services…</p>;
  }

  return (
    <div>
      <Row
        dot={data.gemini ? "🟢" : "🔴"}
        label={data.gemini ? "Gemini 3.6 Flash" : "Gemini API"}
        value={data.gemini ? "Connected" : "Missing"}
      />
      <Row dot={data.hunter ? "🟢" : "⚪"} label="Hunter.io" value={data.hunter ? "Connected" : "Not configured"} />
      <Row
        dot={data.signalhire ? "🟢" : "⚪"}
        label="SignalHire"
        value={data.signalhire ? "Connected" : "Not configured"}
      />
      {/* Apollo row commented out, not deleted -- Apollo is not used (no key,
          the Ingest drawer's Apollo tab is also commented out in
          cold-call-view.tsx). Uncomment both together to bring it back.
      <Row dot={data.apollo ? "🟢" : "⚪"} label="Apollo.io" value={data.apollo ? "Connected" : "Not configured"} />
      */}
      <Row
        dot={data.google_maps ? "🟢" : "⚪"}
        label="Google Maps"
        value={data.google_maps ? "Connected" : "Not configured"}
      />
      <Row
        dot={data.playwright ? "🟢" : "⚪"}
        label="Playwright"
        value={data.playwright ? "Ready" : "Not installed"}
      />
      <p className="mt-1 truncate text-[0.78rem] text-muted">
        <span aria-hidden>📅</span> <span className="font-bold text-text">Calendar:</span>{" "}
        <code className="font-mono text-[0.72rem]">{data.calendar_link.slice(0, 26)}…</code>
      </p>
    </div>
  );
}
