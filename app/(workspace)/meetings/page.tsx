import { SectionHeader } from "@/components/common/section-header";
import { MeetingsCalendar } from "@/components/meetings/meetings-calendar";
import { leadsApi } from "@/lib/api";
import { PAGE_HEADERS } from "@/lib/constants";

// See follow-ups/page.tsx -- no dynamic API here either, so this would fail
// `next build` the same way once that page's error is fixed.
export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  // No stage filter -- the calendar shows every meeting ever booked, not
  // just ones still sitting in meeting_booked (see meetings-calendar.tsx).
  const leads = await leadsApi.list({});

  return (
    <div>
      <SectionHeader
        eyebrow={PAGE_HEADERS.meetings.eyebrow}
        title={PAGE_HEADERS.meetings.title}
        subtitle={PAGE_HEADERS.meetings.subtitle}
      />
      <MeetingsCalendar initialLeads={leads} />
    </div>
  );
}
