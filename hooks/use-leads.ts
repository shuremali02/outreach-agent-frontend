"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  ] as const;
}

export function useLeads(filters: LeadFilters = {}, initialData?: Lead[]) {
  return useQuery({
    queryKey: leadsKey(filters),
    queryFn: () => leadsApi.list(filters),
    initialData,
  });
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

/** "Email Send" -- structure-plan.md Phase 3/4. See lib/api/leads.ts markNeedsEmail(). */
export function useNeedsEmail() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => leadsApi.markNeedsEmail(id),
    onSuccess: invalidate,
  });
}

/** Meetings detail popup's 4-way picker -- structure-plan.md Phase 5. See lib/api/leads.ts meetingOutcome(). */
export function useMeetingOutcome() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: "won" | "proposal_sent" | "followup_due" | "lost" }) =>
      leadsApi.meetingOutcome(id, stage),
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

/** "➕ Add Note" -- always appends server-side, see lib/api/leads.ts addNote(). */
export function useAddNote() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, text, mention }: { id: number; text: string; mention?: MentionPayload }) =>
      leadsApi.addNote(id, text, mention),
    onSuccess: invalidate,
  });
}
