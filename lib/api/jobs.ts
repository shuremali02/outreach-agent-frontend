import { api } from "./client";
import type { Job, JobKind } from "@/types";

export interface DiscoverInput {
  prompt: string;
  max_leads: number;
  /** ISO 3166-1 alpha-2, "" = no constraint. */
  country?: string;
}

export interface ScanInput {
  lead_id: number;
}

export interface QualifyInput {
  prompt: string;
  max_leads: number;
  /** "" = auto. Or "gemini" | "groq" | "grok". */
  provider?: string;
  /**
   * Run the Playwright site scan inside the job. Default false — scanning is
   * slow, so it is normally done per-lead afterwards from the manual button.
   */
  scan?: boolean;
}

export interface MapsQualifyInput {
  /** Google Places text search, e.g. "custom golf cart dealers in Texas". */
  maps_query: string;
  /** Must be one of STANDARD_CATEGORIES. */
  industry_tag: string;
  max_leads: number;
  /** Same meaning as QualifyInput.scan. */
  scan?: boolean;
  /** ISO 3166-1 alpha-2, "" = worldwide. Sent to Google Places as regionCode. */
  country?: string;
  /** Keep Places results that have a phone but no website as call-only leads. */
  keep_call_only?: boolean;
}

export interface ImportInput {
  source: "csv" | "apollo";
  scrape: boolean;
  enrich: boolean;
  /** CSV text, or the Apollo ICP prompt. */
  payload: string;
  limit?: number;
  /**
   * Apollo only. The key the user typed into the form, as app.py:1723 did.
   * Omitted means "use the server's APOLLO_API_KEY". Never stored client-side.
   */
  api_key?: string;
}

export const jobsApi = {
  start: (
    kind: JobKind,
    input: DiscoverInput | ScanInput | ImportInput | QualifyInput | MapsQualifyInput,
  ) => api.post<Job>(`/jobs/${kind}`, input),
  qualify: (input: QualifyInput) => api.post<Job>("/jobs/qualify", input),
  qualifyMaps: (input: MapsQualifyInput) => api.post<Job>("/jobs/qualify-maps", input),
  get: (jobId: string) => api.get<Job>(`/jobs/${jobId}`),
};
