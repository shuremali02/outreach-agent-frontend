import { SectionHeader } from "@/components/common/section-header";
import { PipelineView } from "@/components/pipeline/pipeline-view";
import { leadsApi } from "@/lib/api";
import { ALL_CATEGORIES, ALL_COUNTRIES, PAGE_HEADERS } from "@/lib/constants";

// See cold-call/page.tsx.
export const dynamic = "force-dynamic";

export default async function PipelinePage({ searchParams }: PageProps<"/pipeline">) {
  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : ALL_CATEGORIES;
  const country = typeof sp.country === "string" ? sp.country : ALL_COUNTRIES;
  const q = typeof sp.q === "string" ? sp.q : "";

  // No `stage` param any more (structure-plan.md Phase 4) -- PipelineView narrows to its own scope
  // (Callback Scheduled / Meeting Booked / Email Send) client-side, see its own comment.
  const leads = await leadsApi.list({ category, country, q });

  return (
    <div>
      <SectionHeader
        eyebrow={PAGE_HEADERS.pipeline.eyebrow}
        title={PAGE_HEADERS.pipeline.title}
        subtitle={PAGE_HEADERS.pipeline.subtitle}
      />
      <PipelineView initialLeads={leads} category={category} country={country} q={q} />
    </div>
  );
}
