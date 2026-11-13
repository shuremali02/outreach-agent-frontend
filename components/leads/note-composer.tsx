"use client";

import { Send } from "lucide-react";
import { MentionField } from "@/components/common/mention-field";
import { VoiceRecorder } from "@/components/leads/voice-recorder";
import { Button } from "@/components/ui/button";
import { MENTIONS } from "@/lib/constants";

/**
 * One place to add a note to a lead, text or voice (user, 2026-11-13: the Cold Call card's notes area and the
 * Notes panel should match and look newer). A single rounded composer: a title (with an optional action at its
 * right), the text box, a small hint, and a footer with the mic on the left and "Add note" on the right. The
 * parent keeps the text in its own state and does the saving (on the Cold Call card the same text is also sent
 * with a call outcome, so it cannot live in here).
 */
export function NoteComposer({
  leadId,
  value,
  onChange,
  onAdd,
  adding,
  title = "Add a note",
  placeholder,
  headerAction,
  rows = 2,
}: {
  leadId: number;
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  adding: boolean;
  title?: string;
  placeholder?: string;
  /** Rendered at the right of the title (e.g. "Edit"). */
  headerAction?: React.ReactNode;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-border bg-card p-3 transition-colors focus-within:border-accent">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.85rem] font-semibold">{title}</p>
        {headerAction}
      </div>
      <MentionField value={value} onChange={onChange} rows={rows} placeholder={placeholder} maxLength={4000} />
      <p className="text-[0.72rem] text-muted">{MENTIONS.hint}</p>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
        <VoiceRecorder leadId={leadId} />
        <Button variant="primary" size="sm" loading={adding} disabled={!value.trim()} onClick={onAdd} className="ml-auto">
          <Send className="h-4 w-4" aria-hidden /> {adding ? "Adding…" : "Add note"}
        </Button>
      </div>
    </div>
  );
}
