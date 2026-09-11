"use client";

import { ALL_CATEGORIES, STANDARD_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";

/** st.pills — used on the Cold Call queue and the Contacts directory. */
export function CategoryPills({
  leads,
  selected,
  onSelect,
  allLabel = "All Sectors",
}: {
  leads: Lead[];
  selected: string;
  onSelect: (category: string) => void;
  allLabel?: string;
}) {
  const counts = new Map<string, number>();
  for (const l of leads) counts.set(l.industry_tag, (counts.get(l.industry_tag) ?? 0) + 1);

  const present = [
    ...STANDARD_CATEGORIES.filter((c) => counts.has(c)),
    ...[...counts.keys()].filter((c) => !STANDARD_CATEGORIES.includes(c as never)),
  ];

  const options = [ALL_CATEGORIES, ...present];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((cat) => {
        const active = selected === cat;
        const label =
          cat === ALL_CATEGORIES ? `🌐 ${allLabel} (${leads.length})` : `${cat} (${counts.get(cat)})`;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onSelect(cat)}
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
