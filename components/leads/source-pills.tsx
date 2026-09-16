"use client";

import { ALL_SOURCES, LEAD_SOURCE_LABELS } from "@/lib/constants";
import { leadSource } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";

/** Mirrors country-pills.tsx exactly, keyed on leadSource(lead.source_prompt). */
export function SourcePills({
  leads,
  selected,
  onSelect,
}: {
  leads: Lead[];
  selected: string;
  onSelect: (source: string) => void;
}) {
  const counts = new Map<string, number>();
  for (const l of leads) {
    const key = leadSource(l.source_prompt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const present = [...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  const options = [ALL_SOURCES, ...present];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((s) => {
        const active = selected === s;
        const label =
          s === ALL_SOURCES
            ? `${ALL_SOURCES} (${leads.length})`
            : `${LEAD_SOURCE_LABELS[s as keyof typeof LEAD_SOURCE_LABELS]} (${counts.get(s)})`;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onSelect(s)}
            aria-pressed={active}
            className={cn(
              "cursor-pointer rounded-[8px] border px-3 py-1.5 text-[0.82rem] font-semibold transition-colors",
              active
                ? "border-transparent bg-accent text-white"
                : "border-border bg-card text-muted hover:border-accent hover:text-accent",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
