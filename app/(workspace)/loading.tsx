import { PageLoader } from "@/components/ui/loader";

// Next.js App Router convention: this wraps every page under (workspace)/layout.tsx's `{children}` in a
// Suspense boundary automatically -- shows on first navigation to any of the 10 sidebar tabs AND on
// client-side navigation between them, while that page's server-side data fetch (leadsApi.list(),
// metricsApi.*, etc.) is still in flight. Added 2026-09-22, user request -- see components/ui/loader.tsx.
export default function WorkspaceLoading() {
  return <PageLoader />;
}
