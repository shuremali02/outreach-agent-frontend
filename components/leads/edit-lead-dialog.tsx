"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { LeadEditForm } from "./lead-edit-form";
import type { Lead } from "@/types";

/**
 * The full lead-edit form as a popup -- structure-plan.md Phase 2-4 moved all editing to Leads
 * (Contacts), but every "Edit" button elsewhere used to navigate there in a new tab. The user asked for
 * a popup instead ("dusry tab pr na lekr jaye, wohin popup ho"), so this wraps the same form
 * (components/leads/lead-edit-form.tsx) in a Radix Dialog, closing itself on a successful Save or
 * Remove. Used from Cold Call Desk, Pipeline, Projects and the Meetings' Needs Follow-up list.
 */
export function EditLeadDialog({ lead, trigger }: { lead: Lead; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[480px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[12px] border border-border bg-card p-5 shadow-[var(--shadow-overlay)]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <Dialog.Title className="text-[1.05rem] font-semibold">{lead.company_name}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="cursor-pointer text-[1.1rem] leading-none text-muted hover:text-text"
              >
                ✕
              </button>
            </Dialog.Close>
          </div>
          <LeadEditForm lead={lead} onDone={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
