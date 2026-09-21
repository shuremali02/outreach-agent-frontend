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

/** Every mutation invalidates leads + metrics — the measured version of st.rerun(). */
function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["leads"] });
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
    onSuccess: invalidate,
  });
}

export function useCallOutcome() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id, outcome, notes, meetingAt, mention,
    }: { id: number; outcome: CallOutcome; notes?: string; meetingAt?: string; mention?: MentionPayload }) =>
      leadsApi.recordOutcome(id, outcome, notes ?? "", meetingAt, mention),
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
