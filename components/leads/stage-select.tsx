"use client";

import { PIPELINE_STAGES } from "@/lib/constants";
import { Select } from "@/components/ui/input";
import { useUpdateLead } from "@/hooks/use-leads";
import type { PipelineStage } from "@/types";

/** Changing the stage saves immediately, as the Streamlit selectbox did. */
export function StageSelect({
  leadId,
  value,
  label = "Advance Stage",
}: {
  leadId: number;
  value: PipelineStage;
  label?: string;
}) {
  const update = useUpdateLead();

  return (
    <label className="block">
      <span className="mb-1 block text-[0.8rem] font-semibold text-muted">{label}</span>
      <Select
        value={value}
        disabled={update.isPending}
        onChange={(e) =>
          update.mutate({ id: leadId, input: { pipeline_stage: e.target.value as PipelineStage } })
        }
      >
        {PIPELINE_STAGES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
