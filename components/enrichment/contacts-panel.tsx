"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enrichmentApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { displayDomain } from "@/lib/format";
import type { Lead, LeadContact } from "@/types";
import { EMPTY_STATES } from "@/lib/constants";

/**
 * Provider-neutral replacement for the Hunter-only decision-maker list.
 *
 * Reads GET /leads/{id}/contacts, so it shows contacts from every source (site
 * scrape, Hunter, SignalHire search, a SignalHire reveal) grouped by role, each
 * with a source and confidence badge. "Find people" is a free SignalHire search;
 * "Reveal" spends one credit for a direct email + phone.
 */
const BUCKET_LABEL: Record<string, string> = {
  founder: "Founders & owners",
  sales: "Sales & marketing",
  hr: "People & HR",
  other: "Other",
};
const BUCKET_ORDER = ["founder", "sales", "hr", "other"];

const SOURCE_LABEL: Record<string, string> = {
  site_scrape: "site",
  hunter: "Hunter",
  signalhire: "SignalHire",
  signalhire_reveal: "SignalHire ✓",
  apollo: "Apollo",
  manual: "manual",
};

function hasContactDetail(c: LeadContact): boolean {
  return Boolean(c.email || c.phone);
}

export function ContactsPanel({ lead }: { lead: Lead }) {
  const qc = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["lead-contacts", lead.id],
    queryFn: () => enrichmentApi.contacts(lead.id),
  });

  const findPeople = useMutation({
    mutationFn: () => enrichmentApi.findPeople(lead.id),
    onSuccess: (rows) => qc.setQueryData(["lead-contacts", lead.id], rows),
  });

  // Pending reveal-refetch timers, cleared on unmount so a closed/navigated-
  // away panel never fires a stray invalidate for a query nothing watches.
  const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    return () => {
      revealTimers.current.forEach(clearTimeout);
    };
  }, []);

  const reveal = useMutation({
    mutationFn: (contactId: number) => enrichmentApi.reveal(lead.id, contactId),
    // The webhook fills the details in asynchronously; refetch shortly after.
    onSuccess: () => {
      const timer = setTimeout(() => qc.invalidateQueries({ queryKey: ["lead-contacts", lead.id] }), 4000);
      revealTimers.current.push(timer);
    },
  });

  const grouped = new Map<string, LeadContact[]>();
  for (const c of contacts) {
    const b = BUCKET_ORDER.includes(c.role_bucket) ? c.role_bucket : "other";
    grouped.set(b, [...(grouped.get(b) ?? []), c]);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        size="sm"
        block
        onClick={() => findPeople.mutate()}
        disabled={findPeople.isPending}
      >
        {findPeople.isPending ? "Searching…" : "🎯 Find decision makers"}
      </Button>

      {reveal.isError && (
        <p className="text-[0.78rem] text-danger">
          {reveal.error instanceof Error ? reveal.error.message : "Reveal failed"}
        </p>
      )}

      {!isLoading && contacts.length === 0 && (findPeople.isSuccess || findPeople.isError) && (
        <p
          className="rounded-[8px] px-3 py-2 text-[0.8rem]"
          style={{ background: "var(--warn-tint)", color: "var(--warn)" }}
        >
          {EMPTY_STATES.decisionMakers(displayDomain(lead.company_website))}
        </p>
      )}

      {contacts.length > 0 && (
        <div className="rounded-[8px] border border-border bg-card p-3">
          {BUCKET_ORDER.filter((b) => grouped.has(b)).map((bucket) => (
            <div key={bucket} className="mb-2 last:mb-0">
              <p className="mb-1 text-[0.72rem] font-semibold uppercase tracking-wide text-muted">
                {BUCKET_LABEL[bucket]}
              </p>
              {(grouped.get(bucket) ?? []).map((c) => (
                <div
                  key={c.id}
                  className="flex items-start gap-3 border-b border-border py-2 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.85rem]">
                      <strong>👤 {c.name}</strong>
                      {c.role && <em className="text-muted"> — {c.role}</em>}
                      <span className="ml-2 text-[0.7rem] text-muted">
                        {SOURCE_LABEL[c.source] ?? c.source}
                        {c.confidence > 0 && ` · ${c.confidence}%`}
                      </span>
                    </p>
                    {c.email && (
                      <p className="mt-0.5">
                        <code className="font-mono text-[0.75rem] text-muted">{c.email}</code>
                      </p>
                    )}
                    {c.phone && (
                      <p className="mt-0.5 text-[0.78rem] text-muted">{c.phone}</p>
                    )}
                    {c.linkedin && (
                      <a
                        href={c.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[0.75rem] text-xray-text underline"
                      >
                        LinkedIn
                      </a>
                    )}
                  </div>
                  {c.source === "signalhire" && !hasContactDetail(c) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => reveal.mutate(c.id)}
                      disabled={reveal.isPending}
                      title="Spend one SignalHire credit for a direct email and phone"
                    >
                      {reveal.isPending ? "Revealing…" : "🔓 Reveal"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Back-compat alias: the four host views import this name. */
export { ContactsPanel as HunterDecisionMakers };
