import { Suspense } from "react";
import { SectionHeader } from "@/components/common/section-header";
import { PipelineView } from "@/components/pipeline/pipeline-view";
import { ListSkeleton } from "@/components/ui/skeleton";
import { leadsApi } from "@/lib/api";
import { ALL_CATEGORIES, ALL_COUNTRIES, PAGE_HEADERS } from "@/lib/constants";

// See cold-call/page.tsx.
export const dynamic = "force-dynamic";

/** Split out of Pipeline (user, 2026-10-15): callback-scheduled leads only, same PipelineView with its `scope` prop. */

// The heading shows at once; only the lead list streams in behind its own placeholder (2026-11-13).
export default async function CallbacksPage({ searchParams }: PageProps<"/callbacks">) {
  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : ALL_CATEGORIES;
  const country = typeof sp.country === "string" ? sp.country : ALL_COUNTRIES;
  const q = typeof sp.q === "string" ? sp.q : "";

  return (
    <div>
      <SectionHeader
        eyebrow={PAGE_HEADERS.callbacks.eyebrow}
        title={PAGE_HEADERS.callbacks.title}
        subtitle={PAGE_HEADERS.callbacks.subtitle}
      />
      <Suspense fallback={<ListSkeleton />}>
        <CallbacksData category={category} country={country} q={q} />
      </Suspense>
    </div>
  );
}

async function CallbacksData({ category, country, q }: { category: string; country: string; q: string }) {
  // Must match the view's own filters. Narrowing to this page's own scope happens client-side in the view.
  const leads = await leadsApi.list({ category, country, q, scope: "callbacks" });
  return <PipelineView initialLeads={leads} category={category} country={country} q={q} scope="callbacks" />;
}
