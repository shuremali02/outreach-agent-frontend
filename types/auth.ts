/** Mirrors outreach-backend/app/schemas/auth.py. */
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  avatar_url: string;
}

export interface AuthConfig {
  google_client_id: string;
  allowed_domains: string[];
  auth_required: boolean;
  /** LOCAL TESTING ONLY -- the backend has AUTH_DEV_LOGIN on. */
  dev_login: boolean;
  /** The signup form must ask for the invite code (backend SIGNUP_CODE). */
  signup_code_required: boolean;
  min_password_length: number;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

/** Mirrors the team-activity models in outreach-backend/app/schemas/metrics.py. */
export interface TeamRow {
  /** null = "Unassigned" (recorded before login existed). */
  user_id: number | null;
  name: string;
  avatar_url: string;
  calls: number;
  connected: number;
  emails: number;
  leads_added: number;
  followups: number;
  meetings: number;
  disconnected: number;
  voicemail: number;
  receptionist: number;
  decision_maker: number;
}

export interface TeamToday {
  label: string;
  rows: TeamRow[];
  total: TeamRow;
}

export interface TeamWeek {
  week: number;
  label: string;
  start: string;
  end: string;
  in_progress: boolean;
  rows: TeamRow[];
  total: TeamRow;
  calls_change: number | null;
}

export interface TeamWeeks {
  week1_start: string;
  started: boolean;
  weeks: TeamWeek[];
  before_tracking: TeamRow | null;
}

export interface ActivityFeedItem {
  id: number;
  at: string;
  user_id: number | null;
  user_name: string;
  event_type: string;
  outcome: string | null;
  lead_id: number;
  company_name: string;
}

/** Mirrors NotificationOut in outreach-backend/app/schemas/auth.py. */
export interface AppNotification {
  id: number;
  kind: string;
  actor_user_id: number | null;
  /** Who mentioned you. */
  actor_name: string;
  lead_id: number | null;
  company_name: string;
  problem_id: number | null;
  problem_title: string;
  excerpt: string;
  created_at: string;
  read: boolean;
}
