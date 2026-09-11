"use client";

import { useQuery } from "@tanstack/react-query";
import { metricsApi } from "@/lib/api";
import type { CrmMetrics, SystemStatus } from "@/types";

export function useMetrics(initialData?: CrmMetrics) {
  return useQuery({
    queryKey: ["metrics"],
    queryFn: metricsApi.crm,
    initialData,
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
