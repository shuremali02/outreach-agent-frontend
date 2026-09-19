"use client";

import { LOST_STAGE_CONFIRM, PIPELINE_STAGES, STAGE_LABELS, TOASTS } from "@/lib/constants";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/input";
import { useUpdateLead } from "@/hooks/use-leads";
import type { PipelineStage } from "@/types";

/** Changing the stage saves immediately, as the Streamlit selectbox did. */
export function StageSelect({
  leadId,
  value,
  label = "Advance Stage",
  companyName = "Lead",
}: {
  leadId: number;
  value: PipelineStage;
  label?: string;
  /** Shown in the confirmation snackbar ("<company> moved to <stage>"). */
  companyName?: string;
}) {
  const update = useUpdateLead();
  const toast = useToast();
  const confirm = useConfirm();

  return (
    <label className="block">
      <span className="mb-1 block text-[0.8rem] font-semibold text-muted">{label}</span>
      <Select
        value={value}
        disabled={update.isPending}
        onChange={async (e) => {
          const next = e.target.value as PipelineStage;
          if (next === "lost") {
            const ok = await confirm({
              title: LOST_STAGE_CONFIRM.title(companyName),
              description: LOST_STAGE_CONFIRM.body,
              confirmLabel: LOST_STAGE_CONFIRM.confirmLabel,
              tone: "danger",
            });
            if (!ok) return;
          }
          update.mutate(
            { id: leadId, input: { pipeline_stage: next } },
            {
              onSuccess: () => toast.success(TOASTS.stageChanged(companyName, STAGE_LABELS[next])),
              onError: (err) => toast.error(err instanceof Error ? err.message : TOASTS.actionFailed),
            },
          );
        }}
      >
        {PIPELINE_STAGES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </Select>
      {update.isError && (
        <span className="mt-1 block text-[0.75rem] text-danger">
          {update.error instanceof Error ? update.error.message : "Failed to save the stage change. Try again."}
        </span>
      )}
    </label>
  );
}
