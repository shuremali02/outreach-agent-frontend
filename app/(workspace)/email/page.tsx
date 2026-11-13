import { Suspense } from "react";
import { SectionHeader } from "@/components/common/section-header";
import { EmailDeskView } from "@/components/email/email-desk-view";
import { ListSkeleton } from "@/components/ui/skeleton";
import { leadsApi } from "@/lib/api";
import { PAGE_HEADERS } from "@/lib/constants";

// Live CRM data -- must never be served from a build-time snapshot, same reasoning cold-call/page.tsx
// and linkedin/page.tsx already follow.
export const dynamic = "force-dynamic";

/**
 * The manual Email desk (user, 2026-10-21) -- replaces the placeholder that lived here since
 * 2026-09-22. See components/email/email-desk-view.tsx for the isolation/reuse reasoning.
 * The heading shows at once; only the lead list streams in behind its own placeholder (2026-11-13).
 */
export default async function EmailPage({ searchParams }: PageProps<"/email">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";

  return (
    <div>
      <SectionHeader
        eyebrow={PAGE_HEADERS.email.eyebrow}
        title={PAGE_HEADERS.email.title}
        subtitle={PAGE_HEADERS.email.subtitle}
      />
      <Suspense fallback={<ListSkeleton />}>
        <EmailData q={q} />
      </Suspense>
    </div>
  );
}

async function EmailData({ q }: { q: string }) {
  // Must match EmailDeskView's useLeads() filters exactly, or its initialData is thrown away.
  const leads = await leadsApi.list({ q, slim: false, desk: "email" });
  return <EmailDeskView initialLeads={leads} q={q} />;
}
