import { SectionHeader } from "@/components/common/section-header";
import { PipelineView } from "@/components/pipeline/pipeline-view";
import { leadsApi } from "@/lib/api";
import { ALL_CATEGORIES, ALL_COUNTRIES, PAGE_HEADERS } from "@/lib/constants";

// See cold-call/page.tsx.
export const dynamic = "force-dynamic";

/**
 * Split out of Pipeline (user, 2026-10-15): "callback ka ek apna alag seprate tab ho pipeline me na
 * jayen yeh callback set waly kyun k Golden leads k sath mixup ho rha hai". Same PipelineView component
 * as /pipeline, just scoped to callback-scheduled leads only -- see its `scope` prop.
 */
export default async function CallbacksPage({ searchParams }: PageProps<"/callbacks">) {
  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : ALL_CATEGORIES;
  const country = typeof sp.country === "string" ? sp.country : ALL_COUNTRIES;
  const q = typeof sp.q === "string" ? sp.q : "";

  const leads = await leadsApi.list({ category, country, q });

  return (
    <div>
      <SectionHeader
        eyebrow={PAGE_HEADERS.callbacks.eyebrow}
        title={PAGE_HEADERS.callbacks.title}
        subtitle={PAGE_HEADERS.callbacks.subtitle}
      />
      <PipelineView initialLeads={leads} category={category} country={country} q={q} scope="callbacks" />
    </div>
  );
}
