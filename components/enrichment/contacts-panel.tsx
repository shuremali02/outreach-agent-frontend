"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enrichmentApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PhoneNumberList } from "@/components/leads/phone-number-list";
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
  fullenrich: "FullEnrich",
};

function hasContactDetail(c: LeadContact): boolean {
  return Boolean(c.email || c.phone);
}

// contact_ingest.py _ROLE_LABEL_BY_BUCKET's display names for a scraped role
// mailbox with no named person behind it -- "Find phone" needs an actual
// name + company to look up, so these must never be offered a lookup.
const SYNTHETIC_CONTACT_NAMES = new Set([
  "Sales Team", "HR Team", "Leadership Desk", "Company Desk", "Main line",
]);

function looksLikePerson(name: string): boolean {
  const n = (name || "").trim();
  if (!n || SYNTHETIC_CONTACT_NAMES.has(n)) return false;
  return /^[A-Za-z][\p{L}'.-]*\s+[A-Za-z][\p{L}'.-]+/u.test(n);
}

export function ContactsPanel({
  lead,
  autoSearchOnMount = false,
}: {
  lead: Lead;
  /**
   * Cold Call Desk only (battlecard.tsx) -- that page gates this whole panel
   * behind a click already (rendering it on mount for 30 visible cards at
   * once would fire 30 parallel GETs), so once a rep DOES open it, run the
   * search immediately instead of making them find and click a second
   * "Find decision makers" button inside. Contacts/Pipeline/Today render
   * this panel unconditionally for every visible lead, so they never pass
   * this -- auto-searching there would reintroduce exactly that N-parallel-
   * requests problem, just for findPeople instead of the GET.
   */
  autoSearchOnMount?: boolean;
}) {
  const qc = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["lead-contacts", lead.id],
    queryFn: () => enrichmentApi.contacts(lead.id),
  });

  const findPeople = useMutation({
    mutationFn: () => enrichmentApi.findPeople(lead.id),
    onSuccess: (rows) => qc.setQueryData(["lead-contacts", lead.id], rows),
  });

  const autoSearched = useRef(false);
  useEffect(() => {
    if (!autoSearchOnMount || autoSearched.current || isLoading) return;
    autoSearched.current = true;
    // Only when nothing is already known -- a lead that already has contacts
    // from an earlier bulk enrichment shouldn't get re-searched just for
    // being opened; the manual button below still covers "search again".
    if (contacts.length === 0) findPeople.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSearchOnMount, isLoading, contacts.length]);

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

  // Synchronous, unlike reveal -- FullEnrich is polled to completion
  // server-side, so the response already carries the final contact list.
  //
  // A miss is a normal 200 (find-phone never errors on "no match" -- see
  // app/api/leads.py mark_email_sent's sibling endpoint's docstring), so
  // findPhone.isError below never fires for it. Without noMatchIds, a rep
  // clicking "Find phone" and getting no result saw literally nothing
  // happen -- button just goes back to normal -- so they'd reasonably click
  // it again, risking a second real spend on a lookup that may have simply
  // timed out server-side rather than genuinely missed. Confirmed live
  // 2026-09-16: exactly this happened (Nils Kah's real, billed match was
  // silently lost to a too-short poll window, now fixed separately, but a
  // rep had no way to tell "still nothing" from "spent and lost" either way).
  const [noMatchIds, setNoMatchIds] = useState<Set<number>>(new Set());
  const findPhone = useMutation({
    mutationFn: (contactId: number) => enrichmentApi.findPhone(lead.id, contactId),
    onSuccess: (rows, contactId) => {
      qc.setQueryData(["lead-contacts", lead.id], rows);
      const updated = rows.find((r) => r.id === contactId);
      setNoMatchIds((prev) => {
        const next = new Set(prev);
        if (updated && !updated.phone) next.add(contactId);
        else next.delete(contactId);
        return next;
      });
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

      {findPhone.isError && (
        <p className="text-[0.78rem] text-danger">
          {findPhone.error instanceof Error ? findPhone.error.message : "Find phone failed"}
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
                      <div className="mt-0.5">
                        <PhoneNumberList phones={c.phone} />
                      </div>
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
                    {noMatchIds.has(c.id) && !c.phone && (
                      <p className="mt-0.5 text-[0.75rem] text-muted">
                        📵 No mobile number found for this contact.
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {c.source === "signalhire" && !hasContactDetail(c) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => reveal.mutate(c.id)}
                        // Disabled for every row while ANY reveal is in flight
                        // (this is one shared mutation for the whole panel,
                        // so two clicks in a row would fire two concurrent
                        // credit spends) -- but the "Revealing…" LABEL only
                        // shows on the row actually being revealed, via
                        // reveal.variables (the contactId passed to
                        // .mutate()), so it doesn't look like every contact
                        // is being looked up at once.
                        disabled={reveal.isPending}
                        title="Spend one SignalHire credit for a direct email and phone"
                      >
                        {reveal.isPending && reveal.variables === c.id ? "Revealing…" : "🔓 Reveal"}
                      </Button>
                    )}
                    {!c.phone &&
                      (c.linkedin || (looksLikePerson(c.name) && (lead.company_website || lead.company_name))) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            // Clear the stale "no match" note the moment a
                            // fresh search starts, not just when it resolves.
                            setNoMatchIds((prev) => {
                              const next = new Set(prev);
                              next.delete(c.id);
                              return next;
                            });
                            findPhone.mutate(c.id);
                          }}
                          disabled={findPhone.isPending}
                          title="Look up a mobile phone number via FullEnrich (up to 10 credits, only charged on a match)"
                        >
                          {findPhone.isPending && findPhone.variables === c.id
                            ? "Looking up…"
                            : noMatchIds.has(c.id)
                              ? "📱 Try again"
                              : "📱 Find phone"}
                        </Button>
                      )}
                  </div>
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
