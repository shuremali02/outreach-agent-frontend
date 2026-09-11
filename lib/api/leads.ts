import { api } from "./client";
import type { CallOutcome, CreateLeadInput, Lead, LeadFilters, UpdateLeadInput } from "@/types";

export const leadsApi = {
  list: (filters: LeadFilters = {}) =>
    api.get<Lead[]>("/leads", {
      stage: filters.stage,
      category: filters.category,
      q: filters.q,
    }),
  get: (id: number) => api.get<Lead>(`/leads/${id}`),
  create: (input: CreateLeadInput) => api.post<Lead>("/leads", input),
  update: (id: number, input: UpdateLeadInput) => api.patch<Lead>(`/leads/${id}`, input),
  remove: (id: number) => api.delete<void>(`/leads/${id}`),
  recordOutcome: (id: number, outcome: CallOutcome, rep_notes = "") =>
    api.post<Lead>(`/leads/${id}/outcome`, { outcome, rep_notes }),
};

import type { DecisionMaker, LeadContact, LinkedInResearch, Job } from "@/types";

export const enrichmentApi = {
  researchLinkedIn: (leadId: number) =>
    api.post<LinkedInResearch>(`/leads/${leadId}/research-linkedin`),
  decisionMakers: (leadId: number, limit = 3) =>
    api.get<DecisionMaker[]>(`/leads/${leadId}/decision-makers`, { limit }),
  deepEnrich: (leadId: number) => api.post<Lead>(`/leads/${leadId}/enrich`),
  startScan: (leadId: number) => api.post<Job>("/jobs/scan", { lead_id: leadId }),

  /**
   * Every known decision maker, with provenance. Unlike decisionMakers() this is
   * not Hunter-specific and each row says where it came from.
   */
  contacts: (leadId: number) => api.get<LeadContact[]>(`/leads/${leadId}/contacts`),

  /**
   * Free SignalHire search for the founder / sales / HR contacts at a company.
   * Spends no credits and returns names and titles only — searchByQuery never
   * carries an email or phone.
   */
  findPeople: (leadId: number) => api.post<LeadContact[]>(`/leads/${leadId}/find-people`),

  /**
   * Spend one SignalHire credit on a contact's direct email and phone.
   *
   * 202 with a request id: SignalHire answers asynchronously by POSTing to the
   * backend webhook, so nothing is available yet. Refetch contacts() after.
   * Returns 503 when no public callback URL is configured (i.e. local dev).
   */
  reveal: (leadId: number, contactId: number) =>
    api.post<{ request_id: string; status: string }>(`/leads/${leadId}/reveal`, {
      contact_id: contactId,
    }),
};
