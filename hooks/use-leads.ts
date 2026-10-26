"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { leadsApi } from "@/lib/api";
import type { MentionPayload } from "@/lib/mentions";
import type { CallOutcome, Lead, LeadFilters, UpdateLeadInput } from "@/types";

export function leadsKey(filters: LeadFilters = {}) {
  // Every filter leadsApi.list() actually sends must be in this key -- React
  // Query treats an unchanged key as "same query, don't refetch", so a
  // filter missing here (country was, until this fix) can change on screen
  // while the cached pre-change result keeps being shown, looking like the
  // filter is "working" on stale data instead of actually re-querying.
  return [
    "leads",
    filters.stage ?? null,
    filters.category ?? null,
    filters.country ?? null,
    filters.q ?? null,
    // A slim and a full list are different payloads -- never serve one from the other's cache entry.
    filters.slim === false ? "full" : "slim",
    filters.desk ?? null,
    filters.tried ?? null,
    filters.includeMeetingHidden ? "meeting-hidden" : null,
    filters.bucket ?? null,
    filters.linkedinOwner ?? null,
    // "Load More" pagination (2026-10-13) -- a bigger limit must be its own cache entry, not reuse the
    // smaller page's cached 100 rows.
    filters.limit ?? null,
    filters.offset ?? null,
  ] as const;
}

/** `enabled: false` = don't fetch yet (Cold Call Desk's Voicemail / Hang Up group, until the rep opens it). */
export function useLeads(filters: LeadFilters = {}, initialData?: Lead[], enabled = true) {
  return useQuery({
    queryKey: leadsKey(filters),
    queryFn: () => leadsApi.list(filters),
    initialData,
    enabled,
    // Keeps the current rows on screen while a bigger "Load More" page fetches, instead of the list
    // flashing empty for a moment (same pattern used elsewhere this session, e.g. lead-breakdown-charts.tsx).
    placeholderData: keepPreviousData,
  });
}

/** The long text columns a slim list row leaves empty -- keep in step with SLIM_DEFERRED (backend schemas/lead.py). */
type SlimField =
  | "body"
  | "phone_script"
  | "objection_notes"
  | "product_description"
  | "qualification_notes"
  | "discovery_citations";

/**
 * The full version of a lead that came from the slim list. Call it in the component that shows or edits
 * body / phone_script / objection_notes / product_description (NotesPanel, SiteScanPanel, LeadEditForm,
 * Today's cards) -- those mount only while a card is open, so a page of 50 collapsed cards costs zero
 * extra requests. A lead that is already full (a mutation response patched into the list, or the Cold Call
 * Desk's full list) returns as-is and fetches nothing.
 *
 * `ready` is false until the fetch lands; anything that WRITES those fields back (the edit form) must wait
 * for it, or it would save the empty placeholder over the real text.
 *
 * The updated_at in the key is the freshness signal: the list refetches whenever a lead changes, the new
 * updated_at makes a new key, and the detail is fetched again -- no invalidation to remember at the many
 * places that write these fields. placeholderData keeps showing the previous text while that happens.
 */
export function useFullLead(lead: Lead): { lead: Lead; ready: boolean; failed: boolean } {
  const needs = Boolean(lead.slim);
  const { data, isError } = useQuery({
    queryKey: ["lead", lead.id, lead.updated_at],
    queryFn: () => leadsApi.get(lead.id),
    enabled: needs,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
  if (!needs) return { lead, ready: true, failed: false };
  if (!data) return { lead, ready: false, failed: isError };
  return { lead: { ...lead, ...pickSlimFields(data), slim: false }, ready: true, failed: false };
}

function pickSlimFields(full: Lead): Pick<Lead, SlimField> {
  return {
    body: full.body,
    phone_script: full.phone_script,
    objection_notes: full.objection_notes,
    product_description: full.product_description,
    qualification_notes: full.qualification_notes,
    discovery_citations: full.discovery_citations,
  };
}

/**
 * Every mutation success patches leads + refetches metrics -- the measured version of st.rerun().
 *
 * Used to be a blanket `invalidateQueries({queryKey: ["leads"]})`, which refetches the ENTIRE,
 * unbounded leads table (list_leads() has no limit/offset -- 1400+ rows now, every column) from every
 * currently-mounted page, on every single click. Found live 2026-09-23 ("har button bohut time ly rha
 * hai... application kafi slow hoti ja rhi hai") -- it was never fast, it just gets objectively worse as
 * the table grows, and yesterday's loading spinners made the wait visible for the first time.
 *
 * Every mutation in this file already resolves to the updated Lead (LeadOut) -- react-query passes that
 * as `data`, the first argument to onSuccess, whether or not the handler declares it. So `onSuccess:
 * invalidate` was silently discarding a value it already had. Now: when a Lead comes back, splice it into
 * every cached ["leads", ...] array in place (no network request at all) instead of refetching. Only
 * falls back to a real invalidate when there's no Lead to patch with (useDeleteLead's remove() resolves
 * to void -- removing a row needs its own list-shaped update, not a per-item patch, and deletes are rare
 * enough that a full refetch there is fine).
 */
function useInvalidate() {
  const qc = useQueryClient();
  return (updated?: Lead) => {
    if (updated) {
      qc.setQueriesData<Lead[]>({ queryKey: ["leads"] }, (old) =>
        old ? old.map((l) => (l.id === updated.id ? updated : l)) : old,
      );
    } else {
      qc.invalidateQueries({ queryKey: ["leads"] });
    }
    qc.invalidateQueries({ queryKey: ["metrics"] });
  };
}

export function useUpdateLead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateLeadInput }) =>
      leadsApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteLead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => leadsApi.remove(id),
    // Explicit wrapper, not `onSuccess: invalidate` directly -- remove() resolves to void, and letting
    // TS infer this mutation's TData from invalidate's `(updated?: Lead) => void` signature (instead of
    // from mutationFn's actual return type) breaks the type check. Calling invalidate() with no argument
    // is exactly the "no Lead to patch with, fall back to a real refetch" path anyway.
    onSuccess: () => invalidate(),
  });
}

/** "Send to Cold Call Desk" -- structure-plan.md Phase 2. See lib/api/leads.ts sendToDesk(). */
export function useSendToDesk() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => leadsApi.sendToDesk(id),
    onSuccess: invalidate,
  });
}

export function useCallOutcome() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id, outcome, notes, meetingAt, mention, callbackAt,
    }: {
      id: number; outcome: CallOutcome; notes?: string; meetingAt?: string; mention?: MentionPayload;
      callbackAt?: string;
    }) => leadsApi.recordOutcome(id, outcome, notes ?? "", meetingAt, mention, callbackAt),
    onSuccess: invalidate,
  });
}

/** "Call picked by" row -- tag only, see lib/api/leads.ts callPickedBy(). structure-plan.md Phase 3. */
export function useCallPickedBy() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, value }: { id: number; value: "receptionist" | "decision_maker" | "team_member" }) =>
      leadsApi.callPickedBy(id, value),
    onSuccess: invalidate,
  });
}

/** "Email Send" (REPURPOSED 2026-10-21) -- opens the address picker, moves the lead into the manual
 * Email desk. See lib/api/leads.ts sendToEmailDesk(). */
export function useSendToEmailDesk() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, email }: { id: number; email: string }) => leadsApi.sendToEmailDesk(id, email),
    onSuccess: invalidate,
  });
}

/** Email desk's "✅ Mark Sent" toggle. See lib/api/leads.ts markEmailDeskSent()/unmarkEmailDeskSent(). */
export function useMarkEmailDeskSent() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => leadsApi.markEmailDeskSent(id),
    onSuccess: invalidate,
  });
}

export function useUnmarkEmailDeskSent() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => leadsApi.unmarkEmailDeskSent(id),
    onSuccess: invalidate,
  });
}

/** "Book Another Meeting" on a Pipeline card (2026-10-23). See lib/api/leads.ts bookFollowupMeeting(). */
export function useBookFollowupMeeting() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, meetingAt, notes }: { id: number; meetingAt: string; notes?: string }) =>
      leadsApi.bookFollowupMeeting(id, meetingAt, notes ?? ""),
    onSuccess: invalidate,
  });
}

/** Meetings detail popup's picker -- structure-plan.md Phase 5. See lib/api/leads.ts meetingOutcome(). */
export function useMeetingOutcome() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      stage,
      noShow,
      callbackAt,
    }: {
      id: number;
      stage: "won" | "proposal_sent" | "followup_due" | "lost";
      noShow?: boolean;
      callbackAt?: string;
    }) => leadsApi.meetingOutcome(id, stage, noShow, callbackAt),
    onSuccess: invalidate,
  });
}

/**
 * Pipeline's 3-checkbox re-contact tracker (user request, 2026-09-29) -- see lib/api/leads.ts
 * checkAttempt()/uncheckAttempt() and components/pipeline/attempt-tracker.tsx. "callback" REMOVED
 * 2026-10-16 -- moved to the per-slot hooks below.
 */
export function useCheckAttempt() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, context }: { id: number; context: "no_show" | "proposal" }) =>
      leadsApi.checkAttempt(id, context),
    onSuccess: invalidate,
  });
}

export function useUncheckAttempt() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, context }: { id: number; context: "no_show" | "proposal" }) =>
      leadsApi.uncheckAttempt(id, context),
    onSuccess: invalidate,
  });
}

/** Proposal Sent's Email/Call Attempt trackers, and Pipeline's Callback attempt tracker (REDESIGNED
 * 2026-10-16) -- see lib/api/leads.ts and components/pipeline/followup-tracker.tsx. */
export function useScheduleSlot() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      context,
      index,
      scheduledAt,
      assignedToUserId,
      assignedToTeam,
    }: {
      id: number;
      context: "email_followup" | "call_followup" | "callback" | "no_show_email_followup" | "no_show_call_followup";
      index: number;
      scheduledAt: string;
      assignedToUserId?: number | null;
      assignedToTeam?: boolean;
    }) => leadsApi.scheduleSlot(id, context, index, scheduledAt, assignedToUserId, assignedToTeam),
    onSuccess: invalidate,
  });
}

export function useMarkSlotAttempted() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      context,
      index,
    }: {
      id: number;
      context: "email_followup" | "call_followup" | "callback" | "no_show_email_followup" | "no_show_call_followup";
      index: number;
    }) => leadsApi.markSlotAttempted(id, context, index),
    onSuccess: invalidate,
  });
}

export function useUnmarkSlotAttempted() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      context,
      index,
    }: {
      id: number;
      context: "email_followup" | "call_followup" | "callback" | "no_show_email_followup" | "no_show_call_followup";
      index: number;
    }) => leadsApi.unmarkSlotAttempted(id, context, index),
    onSuccess: invalidate,
  });
}

/** "Star" priority mark -- toggle, tag only, see lib/api/leads.ts toggleStar(). User request, 2026-09-23. */
export function useToggleStar() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => leadsApi.toggleStar(id),
    onSuccess: invalidate,
  });
}

/** "✏️ Edit" on the notes box -- see lib/api/leads.ts editNotes() (409 if the notes changed meanwhile). */
export function useEditNotes() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, text, expected }: { id: number; text: string; expected: string }) =>
      leadsApi.editNotes(id, text, expected),
    onSuccess: invalidate,
  });
}

/** "➕ Add Note" -- always appends server-side, see lib/api/leads.ts addNote(). */
export function useAddNote() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, text, mention }: { id: number; text: string; mention?: MentionPayload }) =>
      leadsApi.addNote(id, text, mention),
    onSuccess: invalidate,
  });
}
