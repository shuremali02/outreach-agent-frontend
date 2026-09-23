import { SectionHeader } from "@/components/common/section-header";
import { ColdCallView } from "@/components/cold-call/cold-call-view";
import { leadsApi } from "@/lib/api";
import { PAGE_HEADERS } from "@/lib/constants";

// Reading `searchParams` already makes this dynamic, but declared explicitly
// too (see meetings/page.tsx) -- this is live CRM data, it must never be
// served from a build-time snapshot regardless of which Dynamic API triggered it.
export const dynamic = "force-dynamic";

export default async function ColdCallPage({ searchParams }: PageProps<"/cold-call">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const leads = await leadsApi.list({ q });

  return (
    <div>
      <SectionHeader
        eyebrow={PAGE_HEADERS.coldCall.eyebrow}
        title={PAGE_HEADERS.coldCall.title}
        subtitle={PAGE_HEADERS.coldCall.subtitle}
      />
      <ColdCallView initialLeads={leads} q={q} />
    </div>
  );
}
