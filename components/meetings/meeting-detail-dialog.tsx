"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { useMeetingOutcome, useNeedsEmail } from "@/hooks/use-leads";
import { NotesPanel } from "@/components/leads/notes-panel";
import { PhoneNumberList } from "@/components/leads/phone-number-list";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { EMAIL_SEND, MEETING_OUTCOMES, STAGE_LABELS, TOASTS, countryLabel } from "@/lib/constants";
import { currency, displayDomain, externalUrl, hasUsableEmail } from "@/lib/format";
import type { Lead } from "@/types";
import { CategoryLabel, Ico, withIcons } from "@/components/ui/emoji-icon";

/**
 * Clicking a meeting on the calendar (components/meetings/meetings-calendar.tsx)
 * did nothing -- the company name was plain text, no way to see the lead's
 * website/contact/notes without leaving the page to find it on Pipeline or
 * Contacts. Confirmed live 2026-09-17. This wraps the same read-only detail
 * fields Contacts already shows, in a centered popup instead of the
 * Collapsible card layout, since a calendar cell has no room for an inline
 * expansion.
 *
 * The outcome buttons moved here from the calendar cell itself (confirmed
 * live 2026-09-18 -- the user found them cluttering the day-cell row), then
 * expanded from a binary Done/Cancel to the 4-way MEETING_OUTCOMES picker
 * the same day (a "Done" that always meant Proposal Sent was wrong for a
 * meeting that went nowhere). Picking one just PATCHes pipeline_stage --
 * the lead stays on the calendar either way, since the calendar no longer
 * filters by stage.
 */
export function MeetingDetailDialog({
  lead,
  trigger,
}: {
  lead: Lead;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // A dedicated endpoint, not a plain PATCH (structure-plan.md Phase 5) -- "lost" (Not Interested) must
  // ALSO hide the lead everywhere, which UpdateLeadInput deliberately cannot do.
  const update = useMeetingOutcome();
  // "Email Send" -- same flag as Cold Call Desk's button (structure-plan.md Phase 3/4), added here too
  // per the user ("whn pr yeh send email wala button bhi add krdo meetings form me").
  const needsEmail = useNeedsEmail();
  const confirm = useConfirm();
  const toast = useToast();

  async function setOutcome(outcome: (typeof MEETING_OUTCOMES)[number]) {
    const ok = await confirm({
      title: outcome.confirmTitle(lead.company_name),
      description: outcome.confirmBody,
      confirmLabel: outcome.confirmLabel,
      tone: outcome.stage === "lost" ? "danger" : "default",
    });
    if (!ok) return;
    update.mutate(
      { id: lead.id, stage: outcome.stage },
      {
        onSuccess: () => {
          toast.success(outcome.done(lead.company_name));
          setOpen(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
      },
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[440px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[12px] border border-border bg-card p-5 shadow-[var(--shadow-overlay)]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <Dialog.Title className="text-[1.05rem] font-semibold">
              {lead.company_name}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="cursor-pointer text-[1.1rem] leading-none text-muted hover:text-text"
              >
                <Ico e="✕" />
              </button>
            </Dialog.Close>
          </div>

          <p className="mb-4 text-[0.85rem] text-muted">
            <Ico e="📅" />{" "}
            {new Date(lead.meeting_at).toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>

          <div className="flex flex-col gap-3">
            {lead.company_website && (
              <a
                href={externalUrl(lead.company_website)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.85rem] text-accent underline"
              >
                <Ico e="🌐" /> {displayDomain(lead.company_website)}
              </a>
            )}
            <p className="text-[0.85rem]">
              <Ico e="👤" /> {lead.contact_name || "—"}
              {lead.contact_role && <span className="text-muted"> · {lead.contact_role}</span>}
            </p>
            {hasUsableEmail(lead.contact_email) && (
              <p className="text-[1rem] font-medium text-text"><Ico e="✉" /> {lead.contact_email}</p>
            )}
            {lead.contact_phone && <PhoneNumberList phones={lead.contact_phone} />}
            <p className="text-[0.85rem] text-muted">
              <Ico e="🌍" /> {lead.country ? countryLabel(lead.country) : "Not specified"} · {currency(lead.deal_value)} ·{" "}
              <CategoryLabel value={lead.industry_tag} />
            </p>
            {lead.reason && (
              <p className="text-[0.82rem] text-muted">
                <strong>Sales Angle:</strong> {lead.reason}
              </p>
            )}

            <NotesPanel lead={lead} />

            <div className="border-t border-border pt-3">
              <p className="mb-2 text-[0.78rem] font-medium text-muted">
                Current stage: {STAGE_LABELS[lead.pipeline_stage]}
              </p>
              {/* One shared `update` mutation for all 4 buttons -- spinner only on the one actually
                  clicked (update.variables), `disabled` still blocks the rest while it's in flight (a rep
                  noticed, 2026-09-23: "loader spinner har button par chal rha hai"). */}
              <div className="grid grid-cols-2 gap-2">
                {MEETING_OUTCOMES.map((outcome) => (
                  <Button
                    key={outcome.stage}
                    variant="secondary"
                    size="sm"
                    loading={update.isPending && update.variables?.stage === outcome.stage}
                    disabled={lead.pipeline_stage === outcome.stage || update.isPending}
                    onClick={() => setOutcome(outcome)}
                  >
                    {outcome.label}
                  </Button>
                ))}
              </div>
              {update.isError && (
                <p className="mt-2 text-[0.78rem] text-danger">
                  {update.error instanceof Error ? update.error.message : "Failed to save this outcome. Try again."}
                </p>
              )}
              <Button
                variant="secondary"
                size="sm"
                block
                className="mt-2"
                title={EMAIL_SEND.help}
                loading={needsEmail.isPending}
                onClick={() =>
                  needsEmail.mutate(lead.id, {
                    onSuccess: () => {
                      toast.success(EMAIL_SEND.sent(lead.company_name));
                      setOpen(false);
                    },
                    onError: (e) => toast.error(e instanceof Error ? e.message : EMAIL_SEND.failed),
                  })
                }
              >
                {withIcons(EMAIL_SEND.button)}
              </Button>
              {needsEmail.isError && (
                <p className="mt-2 text-[0.78rem] text-danger">
                  {withIcons(needsEmail.error instanceof Error ? needsEmail.error.message : EMAIL_SEND.failed)}
                </p>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
