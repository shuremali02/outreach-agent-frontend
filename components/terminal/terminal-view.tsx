"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { metricsApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TickerCard } from "@/components/metrics/ticker-card";
import { currency, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SprintHorizon, TeamMetrics, WeekStats } from "@/types";
import { FUNNEL_STEPS, PAGE_HEADERS, WEEKLY_VELOCITY } from "@/lib/constants";

function FunnelStep({
  label,
  value,
  color,
  sub,
  emphasis = false,
}: {
  label: string;
  value: string;
  color: string;
  sub?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className="mb-2 bg-input px-4 py-2.5"
      style={{ borderLeft: `4px solid ${color}`, borderRadius: "0 8px 8px 0" }}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-[0.85rem]", emphasis && "font-bold")}>{label}</span>
        <span
          className={cn("font-mono font-bold", emphasis ? "text-[1.15rem]" : "text-[0.95rem]")}
          style={{ color }}
        >
          {value}
        </span>
      </div>
      {sub && <div className="text-[0.75rem] text-muted">{sub}</div>}
    </div>
  );
}

function TelephonyGrid({ w }: { w: WeekStats }) {
  const tiles = [
    { label: "Voicemails Left", value: w.voicemails },
    { label: "Gatekeepers & Reception", value: w.gatekeeper },
    { label: "Dead Dials", value: w.dead_dials },
    { label: "Not Interested / DNC", value: w.not_interested },
  ];
  return (
    <Card className="mt-3">
      <p className="metric-label mb-3">Telephony &amp; Call Friction Analysis</p>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-[8px] bg-input px-3 py-2">
            <p className="metric-label !mb-1">{t.label}</p>
            <p className="font-mono text-[1.3rem] font-bold">{num(t.value)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function WeekBlock({ w, defaultOpen }: { w: WeekStats; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const metrics = [
    { label: "Dials/Day", value: num(w.avg_dials_day) },
    { label: "Live Connects", value: num(w.live_interactions) },
    { label: "Explicit Interest", value: num(w.explicit_interest) },
    { label: "Meetings Booked", value: num(w.meetings_scheduled) },
  ];

  return (
    <div className="mb-2 overflow-hidden rounded-[10px] border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full cursor-pointer px-4 py-3 text-left text-[0.9rem]"
      >
        <span className="mr-2 text-muted">{open ? "▾" : "▸"}</span>
        📅 <strong>{w.title} ({w.dates})</strong>
        <span className="text-muted">
          {" "}
          — {num(w.attempts)} Dials · {num(w.live_interactions)} Live Calls ·{" "}
        </span>
        <strong>{num(w.meetings_scheduled)} Meetings</strong>
      </button>
      {open && (
        <div className="border-t border-border px-4 py-4">
          <div className="grid grid-cols-4 gap-3">
            {metrics.map((m) => (
              <div key={m.label}>
                <p className="metric-label">{m.label}</p>
                <p className="text-[1.4rem] font-bold">{m.value}</p>
              </div>
            ))}
          </div>
          <TelephonyGrid w={w} />
        </div>
      )}
    </div>
  );
}

export function TerminalView({ initialData }: { initialData: TeamMetrics }) {
  const [sheetUrl, setSheetUrl] = useState(initialData.source_url);
  const [draftUrl, setDraftUrl] = useState(initialData.source_url);
  const [horizon, setHorizon] = useState<SprintHorizon>("total");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data = initialData, refetch, isFetching } = useQuery({
    queryKey: ["team-metrics", sheetUrl],
    queryFn: () => metricsApi.team(sheetUrl),
    // initialData is only valid for the sheet it was fetched for (SSR'd on
    // first load). Once the user switches sheets, this key has never been
    // fetched -- seeding it with the old sheet's data would render those
    // numbers, briefly mislabeled as belonging to the new URL, while the
    // real fetch is in flight.
    initialData: sheetUrl === initialData.source_url ? initialData : undefined,
  });

  const active: WeekStats =
    horizon === "total" ? data.total : (data.weeks.find((w) => w.week_id === horizon) ?? data.total);

  const horizons: { id: SprintHorizon; label: string }[] = [
    { id: "total", label: "📊 3-Week Aggregate" },
    ...data.weeks.map((w) => ({
      id: (w.week_id ?? "total") as SprintHorizon,
      label: `📅 ${w.title} (${w.dates})`,
    })),
  ];

  return (
    <>
      <div className="mb-5 grid grid-cols-[3fr_1.8fr] items-start gap-6">
        <div>
          <p className="date-eyebrow">{PAGE_HEADERS.terminal.eyebrow}</p>
          <h1 className="hero-heading">{PAGE_HEADERS.terminal.title}</h1>
          <p className="subtitle">{PAGE_HEADERS.terminal.subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`terminal-pill terminal-pill-${data.is_live ? "green" : "amber"}`}>
            {data.is_live ? "🟢 LIVE GOOGLE SHEET SYNC" : "🟡 CACHED BASELINE"}
          </span>
          <p className="text-[0.78rem] text-muted">Updated: {data.synced_at}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Syncing…" : "🔄 Sync Live Sheet"}
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href={data.source_url} target="_blank" rel="noopener noreferrer">
                ↗ Open Sheet
              </a>
            </Button>
          </div>
        </div>
      </div>

      <p className="date-eyebrow">⏱️ Select Sprint Horizon</p>
      <div className="mb-5 grid grid-cols-4 gap-3">
        {horizons.map((h) => (
          <Button
            key={h.id}
            variant={horizon === h.id ? "primary" : "secondary"}
            size="sm"
            onClick={() => setHorizon(h.id)}
          >
            {h.label}
          </Button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-5 gap-3">
        <TickerCard
          label="Outreach Attempts"
          value={num(active.attempts)}
          pill={`${num(active.avg_dials_day)} / day avg pace`}
          pillVariant="amber"
          sub={`${num(active.companies_worked)} companies worked`}
        />
        <TickerCard
          label="Contacts Reached"
          value={num(active.contacts_reached)}
          pill={`${active.contact_rate_pct}% pickup rate`}
          pillVariant="blue"
          sub={`${num(active.dead_dials)} bad / dead dials`}
        />
        <TickerCard
          label="Live Conversations"
          value={num(active.live_interactions)}
          pill={`${active.connect_to_conv_pct}% connect rate`}
          pillVariant="green"
        />
        <TickerCard
          label="Explicit Interest"
          value={num(active.explicit_interest)}
          pill={`${active.interest_rate_pct}% interest rate`}
          pillVariant="green"
          sub={`${num(active.followups)} scheduled follow-ups`}
        />
        <TickerCard
          label="Meetings Booked"
          value={num(active.meetings_scheduled)}
          pill={`${num(active.dials_per_meeting)} dials / meeting`}
          pillVariant="amber"
          sub={`${currency(active.pipeline_value)} Pipeline Value`}
          accentBorder
          valueColor="accent"
        />
      </div>

      <div className="grid grid-cols-[1.4fr_1.6fr] gap-6">
        <Card>
          <p className="metric-label mb-3">Conversion Funnel &amp; Efficiency</p>
          <FunnelStep
            label={FUNNEL_STEPS[0].label}
            value={num(active.attempts)}
            sub={FUNNEL_STEPS[0].sub}
            color="var(--muted)"
          />
          <FunnelStep
            label={FUNNEL_STEPS[1].label}
            value={`${num(active.contacts_reached)} (${active.contact_rate_pct}%)`}
            color="var(--info)"
          />
          <FunnelStep
            label={FUNNEL_STEPS[2].label}
            value={`${num(active.live_interactions)} (${active.connect_to_conv_pct}%)`}
            color="var(--success)"
          />
          <FunnelStep
            label={FUNNEL_STEPS[3].label}
            value={`${num(active.explicit_interest)} (${active.interest_rate_pct}%)`}
            color="var(--warn)"
          />
          <FunnelStep
            label={FUNNEL_STEPS[4].label}
            value={`${num(active.meetings_scheduled)} (${active.meeting_conv_pct}%)`}
            color="var(--accent)"
            emphasis
          />
        </Card>

        <div>
          <Card className="mb-3">
            <p className="metric-label">{WEEKLY_VELOCITY.title}</p>
            <p className="mt-1 text-[0.85rem] text-muted">{WEEKLY_VELOCITY.subtitle}</p>
          </Card>
          {data.weeks.map((w, i) => (
            <WeekBlock key={w.week_id} w={w} defaultOpen={i === 0} />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          className="cursor-pointer text-[0.85rem] font-semibold text-muted hover:text-accent"
        >
          ⚙️ Google Sheets Live Ingestion Settings
        </button>
        {settingsOpen && (
          <Card className="mt-2">
            <p className="mb-2 text-[0.85rem] text-muted">
              Current source:{" "}
              <a href={data.source_url} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                {data.source_url}
              </a>
            </p>
            <Input
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              aria-label="Google Sheets URL"
            />
            <Button
              variant="primary"
              size="sm"
              className="mt-2"
              onClick={() => setSheetUrl(draftUrl)}
            >
              💾 Save Sheet URL &amp; Re-sync
            </Button>
          </Card>
        )}
      </div>
    </>
  );
}
