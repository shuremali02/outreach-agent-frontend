import { SectionHeader } from "@/components/common/section-header";
import { ProblemDesk } from "@/components/problems/problem-desk";
import { PAGE_HEADERS } from "@/lib/constants";

export default function ProblemsPage() {
  return (
    <div>
      <SectionHeader
        eyebrow={PAGE_HEADERS.problems.eyebrow}
        title={PAGE_HEADERS.problems.title}
        subtitle={PAGE_HEADERS.problems.subtitle}
      />
      <ProblemDesk defaultExpanded />
    </div>
  );
}
