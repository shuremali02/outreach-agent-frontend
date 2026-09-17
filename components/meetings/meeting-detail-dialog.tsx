"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { NotesPanel } from "@/components/leads/notes-panel";
import { countryLabel } from "@/lib/constants";
import { currency, displayDomain, externalUrl, hasUsableEmail } from "@/lib/format";
import type { Lead } from "@/types";

/**
 * Clicking a meeting on the calendar (components/meetings/meetings-calendar.tsx)
 * did nothing -- the company name was plain text, no way to see the lead's
 * website/contact/notes without leaving the page to find it on Pipeline or
 * Contacts. Confirmed live 2026-09-17. This wraps the same read-only detail
 * fields Contacts already shows, in a centered popup instead of the
 * Collapsible card layout, since a calendar cell has no room for an inline
 * expansion.
 */
export function MeetingDetailDialog({
  lead,
  trigger,
}: {
  lead: Lead;
  trigger: React.ReactNode;
}) {
  return (
    <Dialog.Root>
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
                ✕
              </button>
            </Dialog.Close>
          </div>

          <p className="mb-4 text-[0.85rem] text-muted">
            📅{" "}
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
                🌐 {displayDomain(lead.company_website)}
              </a>
            )}
            <p className="text-[0.85rem]">
              👤 {lead.contact_name || "—"}
              {lead.contact_role && <span className="text-muted"> · {lead.contact_role}</span>}
            </p>
            {hasUsableEmail(lead.contact_email) && (
              <p className="text-[0.85rem] text-muted">✉️ {lead.contact_email}</p>
            )}
            {lead.contact_phone && <p className="text-[0.85rem] text-muted">📞 {lead.contact_phone}</p>}
            <p className="text-[0.85rem] text-muted">
              🌍 {lead.country ? countryLabel(lead.country) : "Not specified"} · {currency(lead.deal_value)} ·{" "}
              {lead.industry_tag}
            </p>
            {lead.reason && (
              <p className="text-[0.82rem] text-muted">
                <strong>Sales Angle:</strong> {lead.reason}
              </p>
            )}

            <NotesPanel lead={lead} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
