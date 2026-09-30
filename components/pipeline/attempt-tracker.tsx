"use client";

import { useState } from "react";
import { useCheckAttempt, useUncheckAttempt, useMeetingOutcome } from "@/hooks/use-leads";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { Ico } from "@/components/ui/emoji-icon";
import { addedAt } from "@/lib/format";
import { ATTEMPT_TRACKER, TOASTS } from "@/lib/constants";
import type { Lead } from "@/types";

type Context = "callback" | "no_show" | "proposal";

function fields(lead: Lead, context: Context): { attempts: string[]; due: string } {
  if (context === "callback") return { attempts: lead.callback_attempts, due: lead.callback_next_attempt_due };
  if (context === "no_show") return { attempts: lead.no_show_attempts, due: lead.no_show_next_attempt_due };
  return { attempts: lead.proposal_attempts, due: lead.proposal_next_attempt_due };
}

/**
 * Pipeline's 3-checkbox re-contact tracker (user request, 2026-09-29): "meri he team ka dusra banda us
 * lead ko on kry toh usy pata hona chahiye 2 time follow up kr dya gaya hai". One independent set per
 * context (see app/crud/callback_attempts.py) -- rendered once per card, for whichever context that
 * card's stage actually matches (PipelineSummary decides which).
 *
 * Sequential by construction: only the NEXT box (to check) or the LAST checked box (to uncheck) is ever
 * interactive -- everything else is locked, so an attempt can never be skipped or unchecked out of order.
 * Checking the 3rd box does NOT auto-mark the lead -- it shows the same Not Interested confirm the card's
 * own action button uses; declining it leaves the attempt recorded but the lead exactly where it is (user:
 * "no dabany pr lead wohin stuck ho jayegi").
 *
 * History (when each box was actually checked) is deliberately NOT shown inline -- only behind the clock
 * icon (user: "han mark karo lekin show jab karo jab history dekho").
 */
export function AttemptTracker({ lead, context }: { lead: Lead; context: Context }) {
  const check = useCheckAttempt();
  const uncheck = useUncheckAttempt();
  const outcome = useMeetingOutcome();
  const confirm = useConfirm();
  const toast = useToast();
  const [showHistory, setShowHistory] = useState(false);

  const { attempts, due } = fields(lead, context);
  const pending = check.isPending || uncheck.isPending;

  async function onCheck(index: number) {
    check.mutate(
      { id: lead.id, context },
      {
        onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
        onSuccess: async () => {
          if (index !== 2) return; // only the 3rd box prompts anything further
          const ok = await confirm({
            title: ATTEMPT_TRACKER.thirdConfirmTitle(lead.company_name),
            description: ATTEMPT_TRACKER.thirdConfirmBody,
            confirmLabel: ATTEMPT_TRACKER.thirdConfirmLabel,
            tone: "danger",
          });
          if (!ok) return; // attempt stays recorded; lead stays exactly where it is
          outcome.mutate(
            { id: lead.id, stage: "lost" },
            {
              onSuccess: () => toast.success(ATTEMPT_TRACKER.markedNotInterested(lead.company_name)),
              onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
            },
          );
        },
      },
    );
  }

  function onUncheck() {
    uncheck.mutate(
      { id: lead.id, context },
      { onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed) },
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-[8px] border border-border bg-input px-3 py-2">
      <div className="flex items-center justify-between">
        <p className="text-[0.8rem] font-semibold">{ATTEMPT_TRACKER.label[context]}</p>
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          disabled={attempts.length === 0}
          className="cursor-pointer text-muted hover:text-accent disabled:cursor-default disabled:opacity-40"
          title={ATTEMPT_TRACKER.historyTitle}
        >
          <Ico e="🕒" />
        </button>
      </div>

      <div className="flex gap-3">
        {[0, 1, 2].map((i) => {
          const checked = i < attempts.length;
          const canCheck = i === attempts.length; // the next box in sequence
          const canUncheck = checked && i === attempts.length - 1; // the last checked box
          return (
            <label
              key={i}
              className={`flex items-center gap-1 text-[0.78rem] ${
                canCheck || canUncheck ? "cursor-pointer" : "cursor-default text-muted"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={pending || !(canCheck || canUncheck)}
                onChange={() => (checked ? onUncheck() : onCheck(i))}
                className="accent-[var(--accent)]"
              />
              {ATTEMPT_TRACKER.attemptLabel(i + 1)}
            </label>
          );
        })}
      </div>

      {due && attempts.length < 3 && (
        <p className="text-[0.75rem] text-muted">{ATTEMPT_TRACKER.dueLabel(addedAt(due))}</p>
      )}

      {showHistory && (
        <div className="mt-1 flex flex-col gap-0.5 border-t border-border pt-1.5">
          {attempts.length === 0 ? (
            <p className="text-[0.75rem] text-muted">{ATTEMPT_TRACKER.historyEmpty}</p>
          ) : (
            attempts.map((at, i) => (
              <p key={at} className="text-[0.75rem] text-muted">
                {ATTEMPT_TRACKER.attemptLabel(i + 1)}: {addedAt(at)}
              </p>
            ))
          )}
        </div>
      )}
    </div>
  );
}
