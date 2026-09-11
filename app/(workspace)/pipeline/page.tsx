import { SectionHeader } from "@/components/common/section-header";
import { PipelineView } from "@/components/pipeline/pipeline-view";
import { leadsApi } from "@/lib/api";
import type { PipelineStage } from "@/types";
import { ALL_CATEGORIES, PAGE_HEADERS } from "@/lib/constants";

export default async function PipelinePage({ searchParams }: PageProps<"/pipeline">) {
  const sp = await searchParams;
  const stage = (typeof sp.stage === "string" ? sp.stage : "all") as PipelineStage | "all";
  const category = typeof sp.category === "string" ? sp.category : ALL_CATEGORIES;
  const q = typeof sp.q === "string" ? sp.q : "";

  const leads = await leadsApi.list({ stage, category, q });

  return (
    <div>
      <SectionHeader
        eyebrow={PAGE_HEADERS.pipeline.eyebrow}
        title={PAGE_HEADERS.pipeline.title}
        subtitle={PAGE_HEADERS.pipeline.subtitle}
      />
      <PipelineView initialLeads={leads} stage={stage} category={category} q={q} />
    </div>
  );
}
