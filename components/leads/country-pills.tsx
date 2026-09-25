"use client";

import { ALL_COUNTRIES, UNKNOWN_COUNTRY, countryLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";
import { withIcons } from "@/components/ui/emoji-icon";

/** Mirrors category-pills.tsx exactly, keyed on lead.country instead of industry_tag. */
export function CountryPills({
  leads,
  selected,
  onSelect,
}: {
  leads: Lead[];
  selected: string;
  onSelect: (country: string) => void;
}) {
  const counts = new Map<string, number>();
  for (const l of leads) {
    const key = l.country || UNKNOWN_COUNTRY;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const present = [...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  const options = [ALL_COUNTRIES, ...present];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((c) => {
        const active = selected === c;
        const label =
          c === ALL_COUNTRIES
            ? `🌍 ${ALL_COUNTRIES} (${leads.length})`
            : c === UNKNOWN_COUNTRY
              ? `🏳️ Unknown (${counts.get(c)})`
              : `${countryLabel(c)} (${counts.get(c)})`;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onSelect(c)}
            aria-pressed={active}
            className={cn(
              "cursor-pointer rounded-[8px] border px-3 py-1.5 text-[0.82rem] font-semibold transition-colors",
              active
                ? "border-transparent bg-accent text-white"
                : "border-border bg-card text-muted hover:border-accent hover:text-accent",
            )}
          >
            {withIcons(label)}
          </button>
        );
      })}
    </div>
  );
}
