"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  // Installable app (user, 2026-10-18: "hum apny web ko install krny k qabil bana dyn") -- registering
  // public/sw.js is what makes the browser offer "Install app" at all; see that file's own doc comment
  // for what it does once registered. Fails silently (older browsers, or serviceWorker unavailable e.g.
  // non-HTTPS dev origins some browsers restrict it on) -- installability is a bonus, never a requirement
  // to use the app.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

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
