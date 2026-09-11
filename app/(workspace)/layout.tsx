import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { metricsApi } from "@/lib/api";
import type { CrmMetrics, SystemStatus } from "@/types";

/**
 * Shell shared by all 8 views — the direct replacement for the sidebar +
 * if/elif dispatch in app.py. Metrics and status are fetched once here so the
 * badge counts and SYSTEM STATUS don't refetch per page.
 */
export default async function WorkspaceLayout({ children }: LayoutProps<"/">) {
  let metrics: CrmMetrics | undefined;
  let status: SystemStatus | undefined;

  // The shell must render even if the API is down; the client will retry.
  try {
    [metrics, status] = await Promise.all([metricsApi.crm(), metricsApi.status()]);
  } catch {
    metrics = undefined;
    status = undefined;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar initialMetrics={metrics} initialStatus={status} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-[53px] border-b border-border" />}>
          <TopBar />
        </Suspense>
        <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
