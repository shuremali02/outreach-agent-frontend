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
  >
>;
