"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { PipelineSummary } from "./pipeline-view";
import { NotesPanel } from "@/components/leads/notes-panel";
import { PhoneNumberList } from "@/components/leads/phone-number-list";
import { LinkedInResearchPanel, HunterDecisionMakers, SiteScanPanel } from "@/components/enrichment";
import { CategoryLabel, CountryFlag, Ico } from "@/components/ui/emoji-icon";
import { displayDomain, externalUrl, hasUsableEmail } from "@/lib/format";
import { countryLabel } from "@/lib/constants";
import type { Lead } from "@/types";

/**
 * Full lead detail, in a popup instead of inline -- used by the Callbacks page's Grid and Calendar
 * views (components/pipeline/pipeline-view.tsx / callbacks-calendar.tsx), 2026-11-10. User: wanted
 * Callback cards in a grid, not just a vertical list ("card be in grid as well not just in lines") --
 * a tile expanding INLINE in a grid reflows every neighboring tile, so this opens the exact same
 * Company & Contact / Deal + Actions / Notes body the List view's inline-expanding card already shows,
 * as a centered dialog instead. Same content either way -- `PipelineSummary` is the exact component
 * the List view's card body already uses for its middle column.
 */
export function CallbackDetailDialog({ lead, trigger }: { lead: Lead; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[94vw] max-w-[900px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[12px] border border-border bg-card p-5 shadow-[var(--shadow-overlay)]">
          <div className="mb-4 flex items-center justify-between gap-2">
            <Dialog.Title className="text-[1.05rem] font-semibold">
              <Ico e="💼" /> {lead.company_name}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="cursor-pointer text-[1.2rem] leading-none text-muted hover:text-text"
                aria-label="Close"
              >
                ✕
              </button>
            </Dialog.Close>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr_1.2fr]">
            <div className="flex flex-col gap-3">
              <h4 className="text-[1rem] font-semibold">
                <Ico e="🏢" /> Company &amp; Contact
              </h4>
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
              </p>
              {hasUsableEmail(lead.contact_email) && (
                <p className="text-[1rem] font-medium text-text">
                  <Ico e="✉" /> {lead.contact_email}
                </p>
              )}
              {lead.contact_phone && <PhoneNumberList phones={lead.contact_phone} />}

              <LinkedInResearchPanel lead={lead} />
              <HunterDecisionMakers lead={lead} />
              <SiteScanPanel lead={lead} />

              <p className="text-[0.82rem] text-muted">
                <strong>Category:</strong> <CategoryLabel value={lead.industry_tag} />
              </p>
              <p className="text-[0.82rem] text-muted">
                <strong>Country:</strong>{" "}
                {lead.country ? (
                  <>
                    <CountryFlag code={lead.country} /> {countryLabel(lead.country)}
                  </>
                ) : (
                  "Not specified"
                )}
              </p>
              {lead.reason && (
                <p className="text-[0.82rem] text-muted">
                  <strong>Angle:</strong> {lead.reason}
                </p>
              )}
            </div>

            <PipelineSummary lead={lead} />

            <NotesPanel lead={lead} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
