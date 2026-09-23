import { SectionHeader } from "@/components/common/section-header";
import { PAGE_HEADERS } from "@/lib/constants";

// Placeholder route (user, 2026-09-22) -- the "Email" nav tab exists so the sidebar order is right, but
// nothing lives here yet.
export default function EmailPage() {
  return (
    <div>
      <SectionHeader
        eyebrow={PAGE_HEADERS.email.eyebrow}
        title={PAGE_HEADERS.email.title}
        subtitle={PAGE_HEADERS.email.subtitle}
      />
    </div>
  );
}
