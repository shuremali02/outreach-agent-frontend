"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Streamlit refetched everything on every rerun; this is the
            // measured version of that — fresh enough for a sales desk.
            // Bumped 30s -> 60s (2026-09-29, Neon free-tier network-transfer quota audit): halves refetches
            // on remount/navigation for every query that doesn't set its own staleTime (leads, pipeline,
            // contacts, etc. all inherit this).
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
