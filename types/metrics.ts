import type { PipelineStage } from "./lead";

/** Return shape of db.get_crm_metrics(). */
export interface CrmMetrics {
  pipeline_value: number;
  active_opportunities: number;
  won_this_month: number;
  followups_due: number;
  /** All 8 stage keys are always present. */
  stage_counts: Record<PipelineStage, number>;
  total_leads: number;
  /** Derived for the sidebar badge: draft_ready|followup_due and not dead. */
  call_ready_count: number;
  open_problems_count: number;
}

/** Per-week / aggregate block from team_analytics.py. */
export interface WeekStats {
  week_id?: string;
  title: string;
  dates: string;
  attempts: number;
  contacts_reached: number;
  dead_dials: number;
  live_interactions: number;
  meetings_scheduled: number;
  followups: number;
  explicit_interest: number;
  avg_dials_day: number;
  working_days: number;
  companies_worked: number;
  voicemails: number;
  gatekeeper: number;
  not_interested: number;
  pipeline_value: number;

  // derived by compute_derived_metrics(), present on total and every week
  contact_rate_pct: number;
  connect_to_conv_pct: number;
  interest_rate_pct: number;
  meeting_conv_pct: number;
  dials_per_meeting: number;
}

/** Return shape of team_analytics.fetch_team_metrics(). */
export interface TeamMetrics {
  total: WeekStats;
  weeks: WeekStats[];
  /** Clock time when live, literal "Cached Baseline" when not. */
  synced_at: string;
  is_live: boolean;
  source_url: string;
}

export type SprintHorizon = "total" | "week_1" | "week_2" | "week_3";

/** GET /activity-metrics — the Today page's Today/This-Week scrollers, live
 *  from call_events (not the Google Sheet WeekStats/TeamMetrics above). */
export interface ActivityToday {
  calls: number;
  connected: number;
  emails: number;
  leads_added: number;
}

export interface ActivityWeek {
  followups: number;
  meetings: number;
  disconnected: number;
  voicemail: number;
  receptionist: number;
  decision_maker: number;
}

export interface ActivityMetrics {
  today: ActivityToday;
  this_week: ActivityWeek;
}

/** GET /status — drives the sidebar SYSTEM STATUS block. */
export interface SystemStatus {
  gemini: boolean;
  hunter: boolean;
  signalhire: boolean;
  contactout: boolean;
  apollo: boolean;
  google_maps: boolean;
  playwright: boolean;
  calendar_link: string;
  /** Grounded discovery via xAI. When false, discovery falls back to Gemini. */
  xai: boolean;
  /** Which provider a discovery run would use right now: "grok" | "gemini". */
  discovery_provider: string;
}
