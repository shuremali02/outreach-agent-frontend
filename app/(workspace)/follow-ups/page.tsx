import { SectionHeader } from "@/components/common/section-header";
import { FollowUpList } from "@/components/follow-ups/follow-up-list";
import { leadsApi, metricsApi } from "@/lib/api";
import { PAGE_HEADERS } from "@/lib/constants";

export default async function FollowUpsPage() {
  const [leads, status] = await Promise.all([leadsApi.list(), metricsApi.status()]);

  return (
    <div>
      <SectionHeader
        eyebrow={PAGE_HEADERS.followUps.eyebrow}
        title={PAGE_HEADERS.followUps.title}
        subtitle={PAGE_HEADERS.followUps.subtitle}
      />
      <FollowUpList initialLeads={leads} calendarLink={status.calendar_link} />
    </div>
  );
}
