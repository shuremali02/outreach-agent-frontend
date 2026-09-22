import { SectionHeader } from "@/components/common/section-header";
import { ProjectsView } from "@/components/projects/projects-view";
import { leadsApi } from "@/lib/api";
import { ALL_CATEGORIES, ALL_COUNTRIES, PAGE_HEADERS } from "@/lib/constants";

// See meetings/page.tsx -- no dynamic API here either, so this would fail
// `next build` the same way once that page's error is fixed.
export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : ALL_CATEGORIES;
  const country = typeof sp.country === "string" ? sp.country : ALL_COUNTRIES;
  const q = typeof sp.q === "string" ? sp.q : "";

  // No `stage` param -- ProjectsView narrows to its own scope (Proposal Sent / Won) client-side, same
  // approach as Pipeline (structure-plan.md Phase 4/7).
  const leads = await leadsApi.list({ category, country, q });

  return (
    <div>
      <SectionHeader
        eyebrow={PAGE_HEADERS.projects.eyebrow}
        title={PAGE_HEADERS.projects.title}
        subtitle={PAGE_HEADERS.projects.subtitle}
      />
      <ProjectsView initialLeads={leads} category={category} country={country} q={q} />
    </div>
  );
}
