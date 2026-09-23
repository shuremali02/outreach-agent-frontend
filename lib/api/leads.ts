import { api } from "./client";
import type { MentionPayload } from "@/lib/mentions";
import type { CallOutcome, CreateLeadInput, Lead, LeadFilters, UpdateLeadInput } from "@/types";

export const leadsApi = {
  list: (filters: LeadFilters = {}) =>
    api.get<Lead[]>("/leads", {
      stage: filters.stage,
      category: filters.category,
      country: filters.country,
      q: filters.q,
    }),
  get: (id: number) => api.get<Lead>(`/leads/${id}`),
  create: (input: CreateLeadInput) => api.post<Lead>("/leads", input),
  update: (id: number, input: UpdateLeadInput) => api.patch<Lead>(`/leads/${id}`, input),
  remove: (id: number) => api.delete<void>(`/leads/${id}`),
  /**
   * meeting_at (ISO datetime) is only meaningful for outcome="meeting_booked"
   * -- the date/time prompt shown when a rep clicks "🎯 Booked!" sets it.
   * Omitted (not just empty) for every other outcome so it never reaches the
   * backend's extra="forbid" CallOutcomeInput as an unexpected populated field.
   */
  recordOutcome: (
    id: number,
    outcome: CallOutcome,
    rep_notes = "",
    meeting_at?: string,
    mention?: MentionPayload,
    callback_at?: string,
  ) => api.post<Lead>(`/leads/${id}/outcome`, { outcome, rep_notes, meeting_at, callback_at, ...mention }),
  /** "✅ Mark Email Sent" -- see app/api/leads.py mark_email_sent(). */
  markEmailSent: (id: number) => api.post<void>(`/leads/${id}/email-sent`),
  /** "Call picked by" row -- tag only, see app/api/leads.py call_picked_by(). structure-plan.md Phase 3. */
  callPickedBy: (id: number, value: "receptionist" | "decision_maker" | "team_member") =>
    api.post<Lead>(`/leads/${id}/call-picked-by`, { value }),
  /** "Email Send" button -- see app/api/leads.py needs_email(). structure-plan.md Phase 3/4. */
  markNeedsEmail: (id: number) => api.post<Lead>(`/leads/${id}/needs-email`),
  /** "Star" priority mark -- toggle, tag only, see app/api/leads.py star(). User request, 2026-09-23. */
  toggleStar: (id: number) => api.post<Lead>(`/leads/${id}/star`, {}),
  /** Meetings detail popup's 4-way picker -- see app/api/leads.py meeting_outcome(). structure-plan.md Phase 5. */
  meetingOutcome: (id: number, stage: "won" | "proposal_sent" | "followup_due" | "lost") =>
    api.post<Lead>(`/leads/${id}/meeting-outcome`, { stage }),
  /**
   * "Send to Cold Call Desk" on Contacts -- structure-plan.md Phase 2. Always allowed; the desk's own
   * list is everything with sent_to_desk_at set (see crud.send_to_desk()). Idempotent to re-send.
   */
  sendToDesk: (id: number) => api.post<Lead>(`/leads/${id}/send-to-desk`),
  /**
   * "➕ Add Note" -- always APPENDS server-side (see app/crud/leads.py
   * add_note()), never overwrites lead.notes wholesale. Replaces the old
   * "Save Notes" full-field PATCH, which silently lost a call-disposition
   * note appended elsewhere while the Contacts card sat open (confirmed
   * live 2026-09-18).
   */
  addNote: (id: number, text: string, mention?: MentionPayload) =>
    api.post<Lead>(`/leads/${id}/notes`, { text, ...mention }),
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
   * Generate the phone script + objection matrix + email draft for this
   * lead. One Gemini/Groq call, run manually per lead -- bulk search no
   * longer generates this automatically for every candidate.
   */
  generateBattlecard: (leadId: number) => api.post<Lead>(`/leads/${leadId}/battlecard`),

  /**
   * Look up a missing company website via Google Places Text Search. No-op
   * (no API call) server-side if the lead already has one.
   */
  findWebsite: (leadId: number) => api.post<Lead>(`/leads/${leadId}/find-website`),

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

  /**
   * Spend up to 10 FullEnrich credits (0 on a miss) to find ONE contact's
   * mobile phone number. Phone only -- never requests or spends on email.
   * Synchronous: FullEnrich is polled server-side before this resolves, so
   * the response already carries the final contact list.
   */
  findPhone: (leadId: number, contactId: number) =>
    api.post<LeadContact[]>(`/leads/${leadId}/find-phone`, { contact_id: contactId }),

  /**
   * FREE: search the web for ONE named contact's LinkedIn profile (name and
   * company must both appear in the result; the URL must not 404) and save it
   * on the contact. Synchronous. A LinkedIn URL is the best input findPhone
   * accepts, so this is the step to run before spending credits.
   */
  findLinkedIn: (leadId: number, contactId: number) =>
    api.post<LeadContact[]>(`/leads/${leadId}/find-linkedin`, { contact_id: contactId }),
};
