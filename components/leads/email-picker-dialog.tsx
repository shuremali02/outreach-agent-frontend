"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { enrichmentApi } from "@/lib/api/leads";
import { useSendToEmailDesk } from "@/hooks/use-leads";
import { useToast } from "@/components/ui/toast";
import { Ico, withIcons } from "@/components/ui/emoji-icon";
import { Field, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { hasUsableEmail } from "@/lib/format";
import { EMAIL_PICKER, EMAIL_SEND } from "@/lib/constants";
import type { Lead } from "@/types";

const CUSTOM = "__custom__";

/**
 * "Email Send" button's popup (REPURPOSED 2026-10-21, replaces the old one-click needsEmail mutation):
 * pick an address from the lead's own contact_email + its decision-maker contacts (GET
 * /leads/{id}/contacts, same call components/enrichment/contacts-panel.tsx already makes), or type a new
 * one. Confirming moves the lead into the manual Email desk -- see hooks/use-leads.ts useSendToEmailDesk().
 */
export function EmailPickerDialog({
  lead,
  trigger,
  onSent,
}: {
  lead: Lead;
  trigger: React.ReactNode;
  /** Called after a successful send, alongside the toast -- e.g. so a desk page can advance past this
   * card the same way it already does for other actions that take a lead off its queue. */
  onSent?: () => void;
}) {
  const [open, setOpen] = useState(false);
  // The rep's own deliberate pick, if any -- null until they touch the dropdown. Kept separate from
  // the auto-computed default below so a late-arriving contacts fetch can update the default without
  // ever clobbering a choice the rep already made.
  const [userSelected, setUserSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const toast = useToast();
  const sendToEmail = useSendToEmailDesk();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["lead-contacts", lead.id],
    queryFn: () => enrichmentApi.contacts(lead.id),
    enabled: open,
  });

  const options = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    if (hasUsableEmail(lead.contact_email) && !seen.has(lead.contact_email)) {
      seen.add(lead.contact_email);
      list.push(lead.contact_email);
    }
    for (const c of contacts) {
      if (hasUsableEmail(c.email) && !seen.has(c.email)) {
        seen.add(c.email);
        list.push(c.email);
      }
    }
    return list;
  }, [lead.contact_email, contacts]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setCustom("");
      setUserSelected(null);
    }
  }

  // Derived, not stateful: recomputes from the current `options` on every render, so once the
  // contacts fetch resolves (after opening on just lead.contact_email) the right address gets
  // picked automatically -- no effect/setState-in-effect needed, see docs.md 2026-10-22.
  // Exactly one existing address -> pre-selected; none -> straight to the free-text field.
  const autoSelected = options.length === 1 ? options[0] : options.length === 0 ? CUSTOM : "";
  const selected = userSelected ?? autoSelected;

  const chosen = selected === CUSTOM ? custom.trim() : selected;
  const canConfirm = hasUsableEmail(chosen) || (chosen.length > 0 && chosen.includes("@"));

  function confirm() {
    sendToEmail.mutate(
      { id: lead.id, email: chosen },
      {
        onSuccess: () => {
          toast.success(EMAIL_SEND.sent(lead.company_name));
          setOpen(false);
          onSent?.();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : EMAIL_SEND.failed),
      },
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[420px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-[12px] border border-border bg-card p-5 shadow-[var(--shadow-overlay)]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <Dialog.Title className="text-[1.05rem] font-semibold">
              <Ico e="📧" /> {EMAIL_PICKER.title}
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

          <p className="mb-3 text-[0.85rem] text-muted">{withIcons(EMAIL_PICKER.intro)}</p>

          {isLoading ? (
            <p className="text-[0.85rem] text-muted">{EMAIL_PICKER.loadingContacts}</p>
          ) : (
            <div className="flex flex-col gap-2">
              <Field label={EMAIL_PICKER.selectLabel}>
                <Select value={selected} onChange={(e) => setUserSelected(e.target.value)}>
                  {options.length === 0 && <option value={CUSTOM}>{EMAIL_PICKER.noneOption}</option>}
                  {options.map((email) => (
                    <option key={email} value={email}>
                      {email}
                    </option>
                  ))}
                  {options.length > 0 && <option value={CUSTOM}>{EMAIL_PICKER.otherOption}</option>}
                </Select>
              </Field>
              {selected === CUSTOM && (
                <Field label={EMAIL_PICKER.customLabel}>
                  <Input
                    type="email"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder={EMAIL_PICKER.customPlaceholder}
                    autoFocus
                  />
                </Field>
              )}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              {EMAIL_PICKER.cancel}
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={sendToEmail.isPending}
              disabled={!canConfirm}
              onClick={confirm}
            >
              {EMAIL_PICKER.confirm}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
