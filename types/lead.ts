/**
 * One numbered checkbox's state in the Email/Call Attempt or Callback trackers (2026-10-16, see
 * components/pipeline/followup-tracker.tsx). "" = unset for either field. scheduled_at is a naive PKT
 * wall-clock string (same convention as callback_at/meeting_at -- no "Z"); done_at is genuine UTC
 * ("Z"-suffixed, same as every other server action-timestamp).
 */
export interface FollowupSlot {
  scheduled_at: string;
  done_at: string;
  /** Assigning a reminder to a teammate (2026-10-19) -- an ADDITIONAL recipient on top of whoever
   * scheduled it. Only one of the two is ever meaningfully set. */
  assigned_to_user_id: number | null;
  assigned_to_team: boolean;
}

/**
 * Lead — mirrors the `leads` table in db.py (base columns + runtime migrations).
 *
 * Two deliberate contract changes vs. the SQLite storage layer, per the migration plan:
 *   - `has_3d` is a boolean here; SQLite stores INTEGER 0/1.
 *   - `matched_signals` is string[]; SQLite stores a comma-joined string.
 * outreach-backend is responsible for both conversions.
 */
export interface Lead {
  id: number;
  company_name: string;
  company_website: string;
  contact_name: string;
  contact_role: string;
  /** Literal "unknown" when not found — never assume this is a valid address. */
  contact_email: string;
  contact_phone: string;
  contact_linkedin: string;
  /** The COMPANY's own LinkedIn page -- not a person's (that's contact_linkedin above). Found via the
   *  "Search Company LinkedIn (free)" battlecard button, 2026-10-12. */
  company_linkedin: string;
  /** "" = never searched. Set the moment the search runs, hit or miss -- disables the search button
   *  once empty is a confirmed miss, not "haven't tried yet". */
  company_linkedin_checked_at: string;
  /** One of STANDARD_CATEGORIES — the emoji prefix is part of the stored key. */
  industry_tag: string;
  deal_value: number;
  pipeline_stage: PipelineStage;
  /** Vestigial: everything writes "new" and reads pipeline_stage. */
  status: string;
  reason: string;
  subject: string;
  body: string;
  notes: string;
  /** ISO date, YYYY-MM-DD */
  followup_date: string;
  source_prompt: string;
  /** ISO datetime, seconds precision */
  created_at: string;
  updated_at: string;

  // --- runtime-migrated columns ---
  phone_script: string;
  objection_notes: string;
  phone_status: PhoneStatus;
  lead_score: number;
  has_3d: boolean;
  matched_signals: string[];
  product_title: string;
  product_description: string;
  screenshot_path: string;
  enrichment_source: string;
  enriched_at: string;

  // --- qualification + provenance (schema revision 0002) ---
  // Every contact fact now says where it came from. Before these existed a
  // Hunter-verified email and a guessed info@ address rendered identically, so
  // the UI had no way to warn a rep which one they were about to send to.
  /** "qualified" | "rejected" | "unverified" */
  qualification_status: string;
  qualification_score: number;
  /** {stage, verdict, detail} recorded as the funnel ran. */
  qualification_notes: QualificationNote[];
  /** Persisted SiteVerdict, "" when never scanned. */
  site_verdict: string;
  /** A blocked scan is a SUCCESS that proves nothing — see types/scan.ts. */
  site_blocked: boolean;
  site_http_status: number;
  /** ISO datetime, "" when never scanned. */
  last_scanned_at: string;
  /** "site_scrape" | "hunter" | "signalhire" | "signalhire_reveal" | "apollo" | "manual" | "" */
  email_source: string;
  email_confidence: number;
  email_status: string;
  phone_source: string;
  /** ISO 3166-1 alpha-2, used to parse the number against the right region. */
  phone_country: string;
  /**
   * ISO 3166-1 alpha-2 for where the COMPANY trades -- a business fact used
   * for filtering leads, distinct from phone_country above (a phone-parsing
   * region; a UAE company can have a US-format cell number). "" until known.
   */
  country: string;
  /** IANA timezone of whoever answers contact_phone ("" = unknown), derived from its area code. */
  call_tz: string;
  /** Who added / last touched the lead (user ids -- map to names with useUsers()). null = before login existed. */
  created_by_user_id: number | null;
  last_touched_by_user_id: number | null;
  /** ISO datetime, "" = not on the Cold Call Desk (structure-plan.md Phase 1). Set when a rep presses
   * "Send to Cold Call Desk" in Contacts; cleared if the lead is sent back (e.g. Wrong Number). Also
   * doubles as the LinkedIn desk's own membership timestamp (lead_channel below says which one). */
  sent_to_desk_at: string;
  /** "" = the default/Cold Call Desk channel, "linkedin" = added via the LinkedIn desk's "This is a
   * LinkedIn lead" checkbox. Permanent, unlike sent_to_desk_at. User request, 2026-10-05. */
  lead_channel: string;
  /** "" = not set, "maaz" | "bilal" | "asfand" -- whose LinkedIn outreach this lead came from. Only meaningful
   * alongside lead_channel=="linkedin". See lib/constants.ts LINKEDIN_OWNERS. User request, 2026-10-05. */
  linkedin_owner: string;
  /** ISO datetime, "" = not currently in the manual Email desk. Its own field (not sent_to_desk_at/
   * lead_channel, both already spoken for) -- see outreach-backend/app/models.py Lead.email_desk_sent_at.
   * User request, 2026-10-21. */
  email_desk_sent_at: string;
  /** "" = no address chosen yet. Set by the Email Send picker dialog. */
  outreach_email: string;
  /** ISO datetime, "" = not marked sent. The Email desk's "✅ Mark Sent" toggle -- persisted (unlike the
   * older, ephemeral Cold Call Desk "Mark Email Sent" button). */
  email_sent_at: string;
  /** "receptionist" | "decision_maker" | "team_member" | "" -- tag only from the "Call picked by" row,
   * never changes pipeline_stage. */
  call_picked_by: string;
  /** ISO datetime, "" = not hidden. Dead Line / Not Interested set this; such a lead never appears in a
   * GET /leads list (backend excludes it unconditionally), so this is only ever seen via a direct fetch. */
  hidden_at: string;
  /** ISO datetime, "" = no callback scheduled. Set by the Callback Scheduled outcome's date/time prompt --
   * separate from meeting_at, never shown on the Meetings calendar. */
  callback_at: string;
  /** ISO datetime, "" = not starred. "Star" priority mark -- tag only, never changes pipeline_stage.
   * User request, 2026-09-23. */
  starred_at: string;
  /** ISO datetime, "" = never marked. "No Show" meeting outcome -- see PIPELINE_CARD.noShowTag.
   * User request, 2026-09-28. */
  no_show_at: string;
  /**
   * 3-checkbox re-contact tracker (user request, 2026-09-29) -- no_show = Meeting No Show, proposal =
   * Proposal Sent. Each *_attempts is the raw list of when a box was checked (oldest first, max 3
   * entries); each *_next_attempt_due is "" once 0 or 3 attempts are recorded, otherwise the
   * escalating-gap due date (48h after the 1st, 72h after the 2nd, business days only) computed
   * server-side -- see components/pipeline/attempt-tracker.tsx. "callback" REMOVED from this shape
   * 2026-10-16 -- see callback_slots below.
   */
  no_show_attempts: string[];
  no_show_next_attempt_due: string;
  proposal_attempts: string[];
  proposal_next_attempt_due: string;
  /**
   * Proposal Sent's Email/Call Attempt trackers, and Pipeline's Callback attempt tracker (REDESIGNED
   * 2026-10-16: the first version auto-cleared a shared "next due" date the moment any box was checked --
   * confirmed broken live, "mene check mark kya toh woh time gayab ho gaya". User's correction: "hum ye
   * mark kr dyn k is is date ko is bandy ko reminder kr wana hai" -- several INDEPENDENT, pre-plannable
   * reminders, not one auto-clearing due date). Each context is now a list of independent SLOTS (one per
   * numbered checkbox, open-ended via "+") -- see components/pipeline/followup-tracker.tsx. Marking a
   * slot attempted never erases its scheduled_at.
   */
  email_followup_slots: FollowupSlot[];
  call_followup_slots: FollowupSlot[];
  callback_slots: FollowupSlot[];
  /** No Show's own Email/Call trackers (2026-10-19), same per-slot shape as above. */
  no_show_email_followup_slots: FollowupSlot[];
  no_show_call_followup_slots: FollowupSlot[];
  /**
   * true on a row from the slim list (GET /leads?slim=1, what every page but Cold Call Desk loads):
   * body, phone_script, objection_notes, product_description, qualification_notes and discovery_citations
   * are then empty, not missing. Anything that shows or edits those must go through useFullLead()
   * (hooks/use-leads.ts). Absent/false = a full lead.
   */
  slim?: boolean;
  signalhire_uid: string;
  /** URLs the discovery agent actually read, so a lead can be audited. */
  discovery_citations: string[];

  // --- meeting scheduling (schema revision 0003) ---
  /**
   * ISO datetime, "" until a rep books a meeting. Set at the "🎯 Booked!"
   * confirm step; editable afterward via the Pipeline lead card. Distinct
   * from followup_date (a "call again" date for the Follow-up queue).
   */
  meeting_at: string;

  // --- last disposition (schema revision 0006) ---
  /**
   * CallOutcome value from the most recent disposition, "" if never called.
   * pipeline_stage alone can't tell voicemail/callback_scheduled/receptionist
   * apart -- all three collapse to "followup_due" -- this is what the
   * Follow-ups page filters and displays on.
   */
  last_call_outcome: string;
}

export interface QualificationNote {
  stage: string;
  verdict: string;
  detail: string;
}

/**
 * One decision maker — GET /leads/{id}/contacts.
 *
 * Replaces the single contact_* set on the lead as the way to show a founder,
 * a sales manager and HR side by side. `source` and `confidence` are on every
 * row deliberately: DecisionMaker had no provenance, so a real API result and a
 * guess looked the same.
 */
export interface LeadContact {
  id: number;
  lead_id: number;
  name: string;
  role: string;
  /** "founder" | "sales" | "hr" | "other" — the grouping the UI renders by. */
  role_bucket: string;
  email: string;
  phone: string;
  linkedin: string;
  source: string;
  confidence: number;
  is_primary: boolean;
  /** ISO datetime, "" when unverified. */
  verified_at: string;
}

/**
 * Derived client-side from Lead.source_prompt (lib/format.ts leadSource) --
 * not a stored column. The four real values are exactly what qualify.py /
 * lead_engine.py / crud/leads.py already write into source_prompt today, so
 * no migration or backend change is needed to show or filter on this.
 */
export type LeadSource = "sales_team" | "ai_generated" | "google_maps" | "csv_import" | "other";

export type PipelineStage =
  | "new_lead"
  | "draft_ready"
  | "contacted"
  | "followup_due"
  | "meeting_booked"
  | "proposal_sent"
  | "won"
  | "lost";

export type PhoneStatus =
  | "missing"
  | "invalid_format"
  | "switchboard"
  | "verified_direct"
  | "dead_disconnected";

/** Disposition outcomes from the Cold Call Desk 1-click bar. */
export type CallOutcome =
  | "meeting_booked"
  | "voicemail"
  | "dead_number"
  | "not_interested"
  | "callback_scheduled"
  | "receptionist"
  | "decision_maker"
  | "no_answer"
  | "hang_up"
  | "wrong_number"
  | "closed";

export interface LeadFilters {
  stage?: PipelineStage | "all";
  category?: string;
  /** ISO 3166-1 alpha-2, "unknown" for leads with no country recorded, or "all". */
  country?: string;
  q?: string;
  /** Default true: the list omits the long text columns (see Lead.slim). Cold Call Desk passes false. */
  slim?: boolean;
  /** Cold Call Desk / LinkedIn desk / Email desk only (2026-10-05 / 2026-10-21: isolated desks -- see
   * components/cold-call/cold-call-view.tsx's `channel` prop for the first two): just the leads sent to
   * that one desk (server-side, not filtered in the browser). */
  desk?: "cold_call" | "linkedin" | "email";
  /** With desk set: tried=false leaves out the Voicemail / Hang Up group, true = only that group. */
  tried?: boolean;
  /** Meetings page only: also return a lead the meeting popup's "Not Interested" hid, if it has a
   * meeting_at -- see components/meetings/needs-followup-list.tsx. Every other page leaves this off. */
  includeMeetingHidden?: boolean;
  /** Cold Call Desk's "Already Tried" dropdown (2026-10-01): "no_answer" is its own on-demand group
   * (excluded from the default desk+tried:false fetch once anything asks for this bucket); "not_interested"
   * bypasses the hidden_at filter server-side, restricted to exactly that outcome -- Dead Line is never
   * returned this way. Pass `desk` alongside it so the right channel's hidden leads come back (2026-10-05).
   * See components/cold-call/cold-call-view.tsx. */
  bucket?: "no_answer" | "not_interested";
  /** LinkedIn tab's own filter (2026-10-05): whose outreach a lead came from. See LINKEDIN_OWNERS. */
  linkedinOwner?: "maaz" | "bilal" | "asfand";
  /** "Load More" pagination (2026-10-13): absent = the old unbounded fetch (every page except Cold
   *  Call Desk's Already Tried buckets, which can be hundreds of rows). */
  limit?: number;
  offset?: number;
}

/** Payload for POST /leads — the Add a Lead form. */
export interface CreateLeadInput {
  company_name: string;
  company_website?: string;
  contact_name?: string;
  contact_role?: string;
  contact_email?: string;
  contact_phone?: string;
  country?: string;
  deal_value?: number;
  industry_tag?: string;
  pipeline_stage?: PipelineStage;
  reason?: string;
  /** ISO datetime -- only meaningful when pipeline_stage is "meeting_booked". */
  meeting_at?: string;
  /** "+ Add Another Contact" rows -- each becomes a lead_contacts child row,
   * same as a CSV import with several people at one company. */
  extra_contacts?: ExtraContactInput[];
  /** "Team ko batao": an optional first note; @names in it notify those people. */
  team_note?: string;
  mentions?: number[];
  mention_team?: boolean;
  /** "This is a LinkedIn lead" checkbox (2026-10-05) -- tags the new lead for the isolated LinkedIn
   * desk instead of Cold Call Desk. See components/layout/add-lead-popover.tsx. */
  linkedin_lead?: boolean;
  /** Whose LinkedIn outreach this came from -- only shown/meaningful alongside linkedin_lead. */
  linkedin_owner?: "maaz" | "bilal" | "asfand";
}

export interface ExtraContactInput {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
}

/**
 * Payload for PATCH /leads/{id}.
 * Deliberately narrow: db.update_lead() interpolates column names straight into
 * SQL, so the backend must whitelist against exactly these keys.
 */
export type UpdateLeadInput = Partial<
  Pick<
    Lead,
    | "company_name"
    | "company_website"
    | "contact_name"
    | "contact_role"
    | "contact_email"
    | "contact_phone"
    | "contact_linkedin"
    | "country"
    | "industry_tag"
    | "deal_value"
    | "pipeline_stage"
    | "subject"
    | "body"
    | "notes"
    | "followup_date"
    | "phone_status"
    | "lead_score"
    | "has_3d"
    | "product_title"
    | "product_description"
    | "screenshot_path"
    | "enrichment_source"
    | "meeting_at"
    | "callback_at"
  >
>;
