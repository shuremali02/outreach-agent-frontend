import { api } from "./client";
import type {
  ActivityFeedItem,
  ActivityMetrics,
  CrmMetrics,
  SystemStatus,
  TeamMetrics,
  TeamToday,
  TeamWeeks,
} from "@/types";

export const metricsApi = {
  crm: () => api.get<CrmMetrics>("/metrics"),
  status: () => api.get<SystemStatus>("/status"),
  team: (sheetUrl?: string) => api.get<TeamMetrics>("/team-metrics", { sheet_url: sheetUrl }),
  activity: () => api.get<ActivityMetrics>("/activity-metrics"),
  /** Per-person rows for today's PKT sales day (Today page). */
  teamToday: () => api.get<TeamToday>("/team-activity/today"),
  /** Week 1..N, a row per person each (Sales Terminal's Weekly Report). */
  teamWeeks: () => api.get<TeamWeeks>("/team-activity/weeks"),
  /** Recent Activity: who did what, newest first. */
  teamFeed: (userId?: number | null, limit = 100) =>
    api.get<ActivityFeedItem[]>("/team-activity/feed", { user_id: userId ?? undefined, limit }),
};
