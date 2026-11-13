import { Suspense } from "react";
import { SectionHeader } from "@/components/common/section-header";
import { ColdCallView } from "@/components/cold-call/cold-call-view";
import { ListSkeleton } from "@/components/ui/skeleton";
import { leadsApi } from "@/lib/api";
import { PAGE_HEADERS } from "@/lib/constants";

// Reading `searchParams` already makes this dynamic, but declared explicitly too (see cold-call/page.tsx)
// -- this is live CRM data, it must never be served from a build-time snapshot.
export const dynamic = "force-dynamic";

/**
 * New isolated desk (user, 2026-10-05): same battlecard/buttons as Cold Call Desk, reusing ColdCallView
 * unchanged via its `channel` prop -- only leads tagged "linkedin" (Add a Lead's checkbox), never a Cold
 * Call Desk lead and vice versa. See crud/leads.py's `desk`/`lead_channel` for the backend isolation.
 * The heading shows at once; only the lead list streams in behind its own placeholder (2026-11-13).
 */
export default async function LinkedInPage({ searchParams }: PageProps<"/linkedin">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";

  return (
    <div>
      <SectionHeader
        eyebrow={PAGE_HEADERS.linkedin.eyebrow}
        title={PAGE_HEADERS.linkedin.title}
        subtitle={PAGE_HEADERS.linkedin.subtitle}
      />
      <Suspense fallback={<ListSkeleton />}>
        <LinkedInData q={q} />
      </Suspense>
    </div>
  );
}

async function LinkedInData({ q }: { q: string }) {
  // Must match ColdCallView's useLeads() filters exactly, or its initialData is thrown away.
  const leads = await leadsApi.list({ q, desk: "linkedin", tried: false });
  return <ColdCallView initialLeads={leads} q={q} channel="linkedin" />;
}
