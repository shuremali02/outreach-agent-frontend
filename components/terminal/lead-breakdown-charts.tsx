"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { TabButton } from "@/components/common/tab-button";
import { Card } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { metricsApi } from "@/lib/api";
import { ALL_CATEGORIES, ALL_COUNTRIES, LEAD_BREAKDOWN } from "@/lib/constants";
import { num } from "@/lib/format";
import { stripEmoji, withIcons } from "@/components/ui/emoji-icon";
import type { LeadBreakdownRow } from "@/types";

// Confirmed live 2026-10-12: a single grouped-bar chart with both "Leads" (hundreds) and "Connecting"
// (single/low-double digits) on one shared axis made the smaller bars unreadable for every group except
// the top 2-3 -- the exact scale-mismatch the dataviz skill warns against. Split into two single-metric
// charts instead, each with one job: how many leads (volume), and what share of them actually connect
// (a rate, always 0-100 regardless of volume, which is what "which country connects well" actually
// means -- a country with 600 leads and a 10% connect rate is NOT doing better than one with 60 leads
// and a 40% rate). A single series needs no legend -- the chart title already names it.
const SERIES_LEADS = "var(--info)";
const SERIES_RATE = "var(--warn)";
const MAX_BARS = 8;
// Country="" ("Unknown") swamped the top-8 ranking in the first version (418 untagged leads outranked
// most real countries) and contributes nothing actionable to "which country is doing well" -- excluded
// from both charts' ranking, but the table below still lists it so the data-quality gap stays visible.
const UNKNOWN_KEY = "";

function rateOf(r: LeadBreakdownRow): number {
  return r.leads > 0 ? Math.round((r.connecting / r.leads) * 1000) / 10 : 0;
}

// Horizontal bars (category names on the Y axis, reading left-to-right as normal text) -- confirmed
// live 2026-10-12: vertical bars with angled X-axis labels clipped the start of every long category
// name ("🏗️ Real Estate & Megaprojects" rendered as just "& Megaprojects") once the label was longer
// than the space to its left in the chart's own SVG viewport. A horizontal layout has no such limit --
// the label column is sized to the longest label, not squeezed into a rotated diagonal.
const ROW_HEIGHT = 34;
const CHART_TOP_MARGIN = 8;

function SingleMetricChart({
  rows,
  dataKey,
  color,
  valueSuffix = "",
}: {
  rows: { key: string; label: string; value: number }[];
  dataKey: string;
  color: string;
  valueSuffix?: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-[0.85rem] text-muted">{LEAD_BREAKDOWN.empty}</p>;
  }
  const longestLabel = Math.max(...rows.map((r) => r.label.length));
  // ~6.2px per character at this font size, capped so one very long name can't eat the whole chart.
  const labelWidth = Math.min(180, Math.max(70, Math.round(longestLabel * 6.2)));
  return (
    <div style={{ height: rows.length * ROW_HEIGHT + CHART_TOP_MARGIN * 2 }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: CHART_TOP_MARGIN, right: 36, left: 0, bottom: 0 }}
          barCategoryGap="22%"
        >
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            allowDecimals={false}
            unit={valueSuffix}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: "var(--text)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={labelWidth}
          />
          <Tooltip
            cursor={{ fill: "var(--tag)" }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: "0.8rem",
            }}
            labelStyle={{ color: "var(--text)", fontWeight: 600 }}
            formatter={(v) => [`${v}${valueSuffix}`, ""]}
          />
          <Bar
            dataKey={dataKey}
            fill={color}
            radius={[0, 4, 4, 0]}
            label={{ position: "right", fill: "var(--muted)", fontSize: 11, formatter: (v) => `${v}${valueSuffix}` }}
            maxBarSize={22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BreakdownCharts({ rows }: { rows: LeadBreakdownRow[] }) {
  const ranked = useMemo(() => rows.filter((r) => r.key !== UNKNOWN_KEY), [rows]);

  // Emoji stripped for the chart labels only (category names like "🏗️ Real Estate & Megaprojects" --
  // the emoji added width without adding information in a tight axis column); the table below still
  // shows the full name with its icon, matching how categories are labeled everywhere else in the app.
  const byLeads = useMemo(
    () =>
      [...ranked]
        .sort((a, b) => b.leads - a.leads)
        .slice(0, MAX_BARS)
        .map((r) => ({ key: r.key, label: stripEmoji(r.label), value: r.leads })),
    [ranked],
  );
  const byRate = useMemo(
    () =>
      [...ranked]
        .sort((a, b) => rateOf(b) - rateOf(a))
        .slice(0, MAX_BARS)
        .map((r) => ({ key: r.key, label: stripEmoji(r.label), value: rateOf(r) })),
    [ranked],
  );

  if (ranked.length === 0) {
    return <p className="py-6 text-center text-[0.85rem] text-muted">{LEAD_BREAKDOWN.empty}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
      <div>
        <h3 className="mb-2 text-[0.85rem] font-semibold text-muted">{LEAD_BREAKDOWN.totalLeadsHeading}</h3>
        <SingleMetricChart rows={byLeads} dataKey="value" color={SERIES_LEADS} />
      </div>
      <div>
        <h3 className="mb-2 text-[0.85rem] font-semibold text-muted">{LEAD_BREAKDOWN.connectRateHeading}</h3>
        <SingleMetricChart rows={byRate} dataKey="value" color={SERIES_RATE} valueSuffix="%" />
      </div>
    </div>
  );
}

function BreakdownTable({ rows }: { rows: LeadBreakdownRow[] }) {
  if (rows.length === 0) return null;
  const cols: { key: keyof LeadBreakdownRow; label: string }[] = [
    { key: "leads", label: LEAD_BREAKDOWN.columns.leads },
    { key: "connecting", label: LEAD_BREAKDOWN.columns.connecting },
    { key: "pipeline", label: LEAD_BREAKDOWN.columns.pipeline },
    { key: "meetings", label: LEAD_BREAKDOWN.columns.meetings },
    { key: "projects", label: LEAD_BREAKDOWN.columns.projects },
    { key: "emails", label: LEAD_BREAKDOWN.columns.emails },
  ];
  return (
    <div className="mt-6 overflow-x-auto rounded-[10px] border border-border">
      <table className="w-full min-w-[520px] border-collapse text-[0.82rem]">
        <thead>
          <tr className="border-b border-border bg-tag">
            <th className="px-3 py-2 text-left font-semibold text-muted">{LEAD_BREAKDOWN.columns.name}</th>
            <th className="px-3 py-2 text-right font-semibold text-muted">{LEAD_BREAKDOWN.columns.connectRate}</th>
            {cols.map((c) => (
              <th key={c.key} className="px-3 py-2 text-right font-semibold text-muted">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-border last:border-0">
              <td className="px-3 py-2 font-medium">{r.key === UNKNOWN_KEY ? LEAD_BREAKDOWN.unknown : r.label}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted">{rateOf(r)}%</td>
              {cols.map((c) => (
                <td key={c.key} className="px-3 py-2 text-right tabular-nums">
                  {num(r[c.key] as number)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Sales Terminal -> Weekly Report's Lead Breakdown: which country's/category's leads are connecting
 * (a live person was reached), becoming part of Pipeline, booking meetings, closing as projects (won),
 * and getting emailed -- all-time totals, not scoped to the selected week above. Collapsed by default
 * and the query isn't fetched until opened, same pattern as this page's own Recent Activity feed (the
 * underlying query groups across every lead + call_events row, not cheap to run on every page load).
 */
export function LeadBreakdownCharts() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"country" | "category">("country");
  // Cross-filters (user, 2026-10-12: "USA mein campers ke baare mein dekhna hai") -- countryFilter
  // narrows the By Category view down to one country; categoryFilter narrows By Country down to one
  // category. Neither narrows its OWN view (see crud.get_lead_breakdown()'s docstring) -- picking a
  // country still shows every country on the By Country chart, now all scoped to that one category.
  const [countryFilter, setCountryFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  // placeholderData: keepPreviousData (same pattern use-leads.ts already uses) -- confirmed live
  // 2026-10-12: without it, every filter/tab change dropped `data` back to undefined for the moment
  // isLoading was true, so the whole chart+table flashed away and reappeared instead of just updating
  // in place. The old rows now stay on screen (bars don't move) while the new ones load underneath;
  // `isFetching` (not `isLoading`, which is only true before the FIRST fetch ever completes) drives a
  // small inline indicator instead of hiding already-rendered content.
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["lead-breakdown", countryFilter, categoryFilter],
    queryFn: () => metricsApi.breakdown(countryFilter, categoryFilter),
    enabled: open,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const rows = view === "country" ? data?.by_country ?? [] : data?.by_category ?? [];
  // Dropdown options come from the breakdown's own rows (so only countries/categories that actually
  // have leads show up) -- by_country/by_category each stay a complete, unfiltered-by-themselves list
  // regardless of which filter is active, so this is safe to read even while a filter is applied.
  const countryOptions = (data?.by_country ?? []).filter((r) => r.key !== UNKNOWN_KEY);
  const categoryOptions = data?.by_category ?? [];

  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-2 text-left"
      >
        <span className="text-[1.1rem] text-muted" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
        <h2 className="text-[1.2rem] font-semibold">{withIcons(LEAD_BREAKDOWN.heading)}</h2>
        {isFetching && !isLoading && (
          <span className="text-[0.78rem] text-muted" aria-live="polite">
            {LEAD_BREAKDOWN.updating}
          </span>
        )}
      </button>
      {open && (
        <Card className="mt-3">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <Tabs.Root value={view} onValueChange={(v) => setView(v as "country" | "category")}>
              <Tabs.List className="flex gap-2">
                <TabButton value="country">{LEAD_BREAKDOWN.byCountry}</TabButton>
                <TabButton value="category">{LEAD_BREAKDOWN.byCategory}</TabButton>
              </Tabs.List>
            </Tabs.Root>
            {view === "category" ? (
              <Field label={LEAD_BREAKDOWN.filterCountry} className="w-56">
                <Select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
                  <option value="">{ALL_COUNTRIES}</option>
                  {countryOptions.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field label={LEAD_BREAKDOWN.filterCategory} className="w-56">
                <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="">{ALL_CATEGORIES}</option>
                  {categoryOptions.map((r) => (
                    <option key={r.key} value={r.key}>
                      {stripEmoji(r.label)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
          {isLoading ? (
            <p className="py-6 text-center text-[0.85rem] text-muted">…</p>
          ) : (
            <>
              <BreakdownCharts rows={rows} />
              <BreakdownTable rows={rows} />
            </>
          )}
        </Card>
      )}
    </section>
  );
}
