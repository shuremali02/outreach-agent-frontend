/**
 * Long-running work (Playwright scan ~98s, run_agent 30s-5min, CSV synthesis
 * up to hours) never runs as a synchronous request. POST returns a job id and
 * the client polls GET /jobs/{id}.
 */
export type JobKind = "discover" | "scan" | "import" | "qualify" | "qualify_maps";
export type JobStatus = "queued" | "running" | "done" | "error";

export interface Job<TResult = unknown> {
  job_id: string;
  kind: JobKind;
  status: JobStatus;
  /** 0-100 */
  progress: number;
  current: number;
  total: number;
  /** Label of the item in flight, e.g. the company being scanned. */
  message: string;
  result?: TResult;
  error?: string;
}

export interface DiscoverJobResult {
  saved: number;
  /** Company names run_agent found but skipped as already present. */
  skipped_duplicates: string[];
  leads: unknown[];
  /** Set when the Gemini cascade returned nothing usable. */
  error?: string | null;
}

export interface ImportJobResult {
  inserted: number;
  total_parsed: number;
  skipped_duplicates: number;
}

/**
 * Result of a /jobs/qualify run — grounded discovery plus the qualification
 * funnel. Only leads that passed every stage are in `saved_ids`; everything
 * else is in `rejected` with the stage it failed at, so the agent's work is
 * visible even when few leads survive.
 */
export interface QualifyJobResult {
  provider: string;
  model: string;
  discovered: number;
  qualified: number;
  saved_ids: number[];
  rejected: QualifyRejection[];
  skipped_duplicates: string[];
  error?: string | null;
  /** Only present for /jobs/qualify-maps — Places results with no website. */
  no_website_count?: number;
}

export interface QualifyRejection {
  company: string;
  /** "resolve" | "identity" | "fit" | "contacts" | "validate" | "error" */
  stage: string;
  reason: string;
}

/**
 * FastAPI's error envelope. `detail` is a string for an HTTPException and an
 * array of issues for a 422 request-validation failure; lib/api/client.ts
 * flattens both to a single line.
 */
export interface ApiError {
  detail?: string | ValidationIssue[];
  /** Not sent by FastAPI — tolerated so a proxy or gateway error still reads. */
  error?: string;
}

export interface ValidationIssue {
  loc: (string | number)[];
  msg: string;
  type: string;
}
