"use client";

import { useQuery } from "@tanstack/react-query";
import { metricsApi } from "@/lib/api";
import type { CrmMetrics, SystemStatus } from "@/types";

export function useMetrics(initialData?: CrmMetrics) {
  return useQuery({
    queryKey: ["metrics"],
    queryFn: metricsApi.crm,
    initialData,
    // Rendered by the Sidebar (every page, every navigation) -- the app's single highest-frequency query
    // under the global 30s default. Badge counts don't need to be that fresh; matches useSystemStatus below.
    // Neon free-tier network-transfer quota audit, 2026-09-29.
    staleTime: 5 * 60_000,
  });
}

export function useSystemStatus(initialData?: SystemStatus) {
  return useQuery({
    queryKey: ["status"],
    queryFn: metricsApi.status,
    initialData,
    staleTime: 5 * 60_000,
  });
}
