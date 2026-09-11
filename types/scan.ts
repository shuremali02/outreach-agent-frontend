/**
 * Playwright scan result — scraper.scan_site() / check_configurator().
 * Both return this identical 9-key shape on EVERY path and never raise.
 */
export interface ScanResult {
  has_3d: boolean;
  matched_signals: string[];
  weak_signals: string[];
  product_title: string;
  product_description: string;
  screenshot_path: string;
  /** 0 when unknown. */
  http_status: number;
  /** http_status >= 400 OR looks_blocked(). NOTE: blocked is a SUCCESS, error stays "". */
  blocked: boolean;
  /** "" on success. */
  error: string;

  /**
   * Set by outreach-backend on a fresh scan (it runs agent_core.site_matches_lead
   * server-side). Absent when the ScanResult was reconstructed from columns
   * persisted on the lead — lib/verdict.ts falls back to a local heuristic then.
   */
  verdict?: SiteVerdict;
  verdict_detail?: string;

  /** Emails found in mailto: links and page text on the site + its contact page. */
  emails?: string[];
  /** Numbers found in tel: links. */
  phones?: string[];
  /** Same-origin contact/about pages the scanner also read. */
  contact_pages?: string[];
  /** lead_contacts rows the harvest created or updated. */
  contacts_found?: number;
}

/** agent_core.site_matches_lead() -> (verdict, detail) */
export type SiteVerdict = "match" | "mismatch" | "blocked" | "unknown";

export interface VerdictResult {
  verdict: SiteVerdict;
  detail: string;
}

/** agent_core.get_top_decision_makers() */
export interface DecisionMaker {
  name: string;
  position: string;
  email: string;
  confidence: number;
  type: string;
  linkedin_url: string;
}

/** agent_core.research_prospect_linkedin() — same 7 keys on both paths. */
export interface LinkedInResearch {
  success: boolean;
  contact_name: string;
  contact_role: string;
  linkedin_url: string;
  company_linkedin: string;
  google_xray_url: string;
  reason: string;
}
