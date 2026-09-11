import { SectionHeader } from "@/components/common/section-header";
import { DiscoveryForm } from "@/components/lead-finder/discovery-form";
import { PAGE_HEADERS } from "@/lib/constants";

export default function LeadFinderPage() {
  return (
    <div>
      <SectionHeader
        eyebrow={PAGE_HEADERS.leadFinder.eyebrow}
        title={PAGE_HEADERS.leadFinder.title}
        subtitle={PAGE_HEADERS.leadFinder.subtitle}
      />
      <DiscoveryForm />
    </div>
  );
}
