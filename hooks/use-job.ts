"use client";

import { useQuery } from "@tanstack/react-query";
import { jobsApi } from "@/lib/api";

/**
 * Polls a long-running job until it reaches a terminal state. This is the
 * piece Streamlit could not do — it blocked the script thread for up to 98s
 * on a single Playwright scan.
 */
export function useJob(jobId: string | null) {
  return useQuery({
    queryKey: ["job", jobId],
    queryFn: () => jobsApi.get(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "done" || status === "error" ? false : 700;
    },
  });
}
