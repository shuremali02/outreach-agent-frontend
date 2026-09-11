import { api } from "./client";
import type { CrmMetrics, SystemStatus, TeamMetrics } from "@/types";

export const metricsApi = {
  crm: () => api.get<CrmMetrics>("/metrics"),
  status: () => api.get<SystemStatus>("/status"),
  team: (sheetUrl?: string) => api.get<TeamMetrics>("/team-metrics", { sheet_url: sheetUrl }),
};
