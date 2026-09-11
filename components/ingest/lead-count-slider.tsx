"use client";

import { GEMINI_QUOTA_CAPTION } from "@/lib/constants";

/** The 3 "how many leads" sliders, with the shared Gemini quota caption. */
export function LeadCountSlider({
  label,
  value,
  onChange,
  min = 5,
  max = 25,
  step = 1,
  showQuotaCaption = true,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showQuotaCaption?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[0.8rem] font-semibold text-muted">
        {label}: <span className="font-mono text-text">{value}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
      {showQuotaCaption && <p className="mt-1 text-[0.75rem] text-muted">{GEMINI_QUOTA_CAPTION}</p>}
    </div>
  );
}
